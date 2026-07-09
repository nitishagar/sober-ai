const request = require('supertest');
const { makeTestServer } = require('../helpers/server');
const { collectSSE } = require('../helpers/sse');
const { truncateAll, disconnect } = require('../helpers/db');
const app = require('../../src/api/server');

const CANNED_DATA = require('../e2e/helpers/canned-gatherer-data');
const Auditor = require('../../src/core/auditor');
const ProviderFactory = require('../../src/llm/providers/ProviderFactory');

// Mock runGatherers so the audit completes against canned data (no live browser).
jest.spyOn(Auditor.prototype, 'runGatherers').mockResolvedValue(CANNED_DATA);

const testServer = makeTestServer(app);

describe('BYO-key request contract (invariant D: key isolation)', () => {
  beforeAll(() => testServer.start());
  afterAll(async () => {
    await testServer.stop();
    await disconnect();
  });
  beforeEach(truncateAll);

  it('constructs the provider from X-LLM-* headers when a BYO key is supplied', async () => {
    const createSpy = jest.spyOn(ProviderFactory, 'create');

    await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://byo-header.example.com' },
      {
        maxEvents: 20,
        timeoutMs: 30000,
        headers: {
          'X-LLM-API-Key': 'byo-key-header-value',
          'X-LLM-Endpoint': 'https://integrate.api.nvidia.com/v1',
          'X-LLM-Model': 'meta/llama-3.1-8b-instruct',
          'X-LLM-Provider': 'openai'
        }
      }
    );

    expect(createSpy).toHaveBeenCalled();
    const byoCall = createSpy.mock.calls.find(
      ([s]) => s && s.apiKey === 'byo-key-header-value'
    );
    expect(byoCall).toBeDefined();
    expect(byoCall[0].provider).toBe('openai');
    expect(byoCall[0].endpoint).toBe('https://integrate.api.nvidia.com/v1');
    expect(byoCall[0].model).toBe('meta/llama-3.1-8b-instruct');

    createSpy.mockRestore();
  });

  it('falls back to loadProviderSettings (global DB) when no X-LLM-* headers are sent', async () => {
    const createSpy = jest.spyOn(ProviderFactory, 'create');

    await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://no-header.example.com' },
      { maxEvents: 20, timeoutMs: 30000 }
    );

    expect(createSpy).toHaveBeenCalled();
    // No BYO key in any call — the global DB path was used.
    const byoCall = createSpy.mock.calls.find(
      ([s]) => s && s.apiKey === 'byo-key-header-value'
    );
    expect(byoCall).toBeUndefined();

    createSpy.mockRestore();
  });

  it('SSE progress/completion payloads never contain the BYO key (invariant C/E)', async () => {
    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://sse-no-key.example.com' },
      {
        maxEvents: 20,
        timeoutMs: 30000,
        headers: { 'X-LLM-API-Key': 'must-not-leak-key' }
      }
    );

    expect(events.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('must-not-leak-key');
  });

  it('test-connection with a body key uses the body (BYO), empty body still ok via fallback', async () => {
    // Empty body → fallback to loadProviderSettings → stub Ollama → ok:true (locked contract)
    const emptyRes = await request(app)
      .post('/api/settings/test-connection')
      .send();
    expect(emptyRes.status).toBe(200);
    expect(emptyRes.body.ok).toBe(true);

    // Body with provider + apiKey → BYO test. The OpenAI provider will try a real
    // network call to /models which fails without a live endpoint; assert it used
    // the body (not the DB) by spying on ProviderFactory.create.
    const createSpy = jest.spyOn(ProviderFactory, 'create');
    await request(app)
      .post('/api/settings/test-connection')
      .send({
        provider: 'openai',
        apiKey: 'byo-test-conn-key',
        endpoint: 'https://integrate.api.nvidia.com/v1',
        model: 'meta/llama-3.1-8b-instruct'
      });

    const byoCall = createSpy.mock.calls.find(
      ([s]) => s && s.apiKey === 'byo-test-conn-key'
    );
    expect(byoCall).toBeDefined();
    expect(byoCall[0].provider).toBe('openai');
    expect(byoCall[0].endpoint).toBe('https://integrate.api.nvidia.com/v1');

    createSpy.mockRestore();
  });
});
