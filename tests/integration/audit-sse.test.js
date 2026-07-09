const request = require('supertest');
const { makeTestServer } = require('../helpers/server');
const { collectSSE, collectSSEGet } = require('../helpers/sse');
const { truncateAll, disconnect } = require('../helpers/db');
const app = require('../../src/api/server');
const logger = require('../../src/utils/logger');

const CANNED_DATA = require('../e2e/helpers/canned-gatherer-data');

// Mock runGatherers before loading Auditor module
const Auditor = require('../../src/core/auditor');
jest.spyOn(Auditor.prototype, 'runGatherers').mockResolvedValue(CANNED_DATA);

const testServer = makeTestServer(app);

describe('POST /api/audit-progress (SSE)', () => {
  beforeAll(() => testServer.start());
  afterAll(async () => {
    await testServer.stop();
    await disconnect();
  });
  beforeEach(truncateAll);

  it('returns 400 when url is missing', async () => {
    const res = await request(app).post('/api/audit-progress').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/i);
  });

  it('returns 400 when url is malformed (invariant I)', async () => {
    const res = await request(app).post('/api/audit-progress').send({ url: 'not-a-url' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/i);
  });

  it('returns 400 when url uses a non-http(s) scheme (invariant I)', async () => {
    const res = await request(app).post('/api/audit-progress').send({ url: 'ftp://example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/i);
  });

  it('streams started → processing → completed events', async () => {
    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://example.com' },
      { maxEvents: 20, timeoutMs: 30000 }
    );

    expect(events.length).toBeGreaterThan(0);

    const firstEvent = events[0];
    expect(firstEvent.status).toBe('started');
    expect(firstEvent.sessionId).toBeDefined();

    const completedEvent = events.find(e => e.status === 'completed');
    expect(completedEvent).toBeDefined();
    expect(completedEvent.reportId).toBeDefined();
    expect(typeof completedEvent.reportId).toBe('string');
  });

  it('saves report to DB after successful audit', async () => {
    const { getPrisma } = require('../helpers/db');

    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://test-audit.example.com' },
      { maxEvents: 20, timeoutMs: 30000 }
    );

    const completedEvent = events.find(e => e.status === 'completed');
    expect(completedEvent).toBeDefined();

    const prisma = getPrisma();
    const report = await prisma.report.findUnique({ where: { id: completedEvent.reportId } });
    expect(report).not.toBeNull();
    expect(report.url).toBe('https://test-audit.example.com');
  });

  it('emits progress events with increasing progress values', async () => {
    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://progress-test.example.com' },
      { maxEvents: 20, timeoutMs: 30000 }
    );

    const progressEvents = events.filter(e => e.status === 'processing');
    expect(progressEvents.length).toBeGreaterThan(0);

    // Progress values should be non-decreasing
    for (let i = 1; i < progressEvents.length; i++) {
      expect(progressEvents[i].progress).toBeGreaterThanOrEqual(progressEvents[i - 1].progress);
    }
  });

  it('reconnects mid-run via session stream endpoint and receives completed event', async () => {
    // Start audit, grab only the 'started' event to get sessionId
    const firstEvents = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://reconnect-test.example.com' },
      { maxEvents: 1, timeoutMs: 10000 }
    );

    expect(firstEvents.length).toBeGreaterThan(0);
    expect(firstEvents[0].status).toBe('started');
    const sessionId = firstEvents[0].sessionId;
    expect(sessionId).toBeDefined();

    // Wait briefly for audit to make progress before reconnecting
    await new Promise(r => setTimeout(r, 300));

    // Reconnect via GET session stream endpoint
    const reconnectEvents = await collectSSEGet(
      `${testServer.url()}/api/audit-progress/session/${sessionId}/stream`,
      { maxEvents: 30, timeoutMs: 30000 }
    );

    expect(reconnectEvents.length).toBeGreaterThan(0);
    // First event is always a catch-up snapshot of current state
    const snapshot = reconnectEvents[0];
    expect(['started', 'processing', 'completed']).toContain(snapshot.status);

    // Should eventually see the completed event (either in snapshot or later)
    const completedEvent = reconnectEvents.find(e => e.status === 'completed');
    expect(completedEvent).toBeDefined();
    expect(typeof completedEvent.reportId).toBe('string');
  });

  it('emits error event when LLM provider fails', async () => {
    // Capture logger.error calls to verify the audit-failure sink is routed through
    // the logger (invariant C: redaction must apply at this sink).
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    const genSpy = jest.spyOn(Auditor.prototype, 'generateRecommendations')
      .mockRejectedValueOnce(new Error('LLM connection refused'));

    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://llm-fail-test.example.com' },
      { maxEvents: 20, timeoutMs: 30000 }
    );

    const errorEvent = events.find(e => e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(typeof errorEvent.message).toBe('string');
    expect(typeof errorEvent.progress).toBe('number');
    expect(errorEvent.error).toBeDefined();
    expect(typeof errorEvent.error.type).toBe('string');
    expect(typeof errorEvent.error.details).toBe('string');

    // Sink coverage (invariant C): the route-level audit-failure catch logs via
    // logger.error (not raw console.error), so a key-bearing axios error reaching
    // this sink is redacted by redactSecrets. Assert BEFORE restoring the spies.
    expect(errorSpy).toHaveBeenCalled();
    const sinkCall = errorSpy.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('[API] Audit failed')
    );
    expect(sinkCall).toBeDefined();

    genSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('emits error event with timeout message on network timeout', async () => {
    const gatherSpy = jest.spyOn(Auditor.prototype, 'runGatherers')
      .mockRejectedValueOnce(new Error('timeout waiting for network response'));

    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://timeout-test.example.com' },
      { maxEvents: 10, timeoutMs: 15000 }
    );

    gatherSpy.mockRestore();

    const errorEvent = events.find(e => e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent.message).toMatch(/timed?\s?out/i);
    expect(typeof errorEvent.error.type).toBe('string');
    expect(errorEvent.error.details).toMatch(/timeout/i);
  });

  it('error event contains all required fields with correct types', async () => {
    const gatherSpy = jest.spyOn(Auditor.prototype, 'runGatherers')
      .mockRejectedValueOnce(new Error('ENOTFOUND some-domain.invalid'));

    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://structure-test.example.com' },
      { maxEvents: 10, timeoutMs: 15000 }
    );

    gatherSpy.mockRestore();

    const errorEvent = events.find(e => e.status === 'error');
    expect(errorEvent).toBeDefined();
    expect(typeof errorEvent.status).toBe('string');
    expect(typeof errorEvent.message).toBe('string');
    expect(typeof errorEvent.progress).toBe('number');
    expect(typeof errorEvent.error).toBe('object');
    expect(typeof errorEvent.error.type).toBe('string');
    expect(typeof errorEvent.error.details).toBe('string');
  });
});
