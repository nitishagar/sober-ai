const http = require('http');
const request = require('supertest');
const app = require('../../src/api/server');
const { truncateAll, disconnect } = require('../helpers/db');
const { COOKIE_NAME } = require('../../src/api/middleware/owner-token');
const Auditor = require('../../src/core/auditor');
const reportService = require('../../src/services/reportService');

const TOKEN_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const TOKEN_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const TERMINAL = ['completed', 'failed', 'partial'];
const WEBHOOK_FINAL = ['delivered', 'failed', 'skipped'];

function cannedResult(url) {
  return {
    url,
    scores: { overall: 80, grade: 'B' },
    auditResults: {
      ssrReadiness: { score: 80 },
      schemaCoverage: { score: 80 },
      semanticStructure: { score: 80 },
      contentExtractability: { score: 80 },
      machineReadability: { score: 80 }
    },
    metadata: { detectedIndustry: 'general' },
    duration: 1,
    recommendations: {}
  };
}

async function pollStatus(jobId, cookie, timeoutMs = 15000) {
  const start = Date.now();
  for (;;) {
    const req = request(app).get(`/api/status/${jobId}`);
    if (cookie) req.set('Cookie', cookie);
    const res = await req;
    if (res.status === 200 && TERMINAL.includes(res.body.status) && WEBHOOK_FINAL.includes(res.body.webhookStatus)) {
      return res;
    }
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for terminal state: ${JSON.stringify(res.body)}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

function startHookServer(handler) {
  return new Promise((resolve) => {
    const received = [];
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        received.push({ url: req.url, method: req.method, body });
        handler(req, res);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, received, port: server.address().port }));
  });
}

describe('Batch API (Cycle 1)', () => {
  let auditSpy;
  let reportSpy;
  const originalOwnerFlag = process.env.OWNER_TOKEN_REQUIRED;
  const originalSsrfFlag = process.env.SSRF_BLOCK_PRIVATE;

  beforeAll(() => {
    // Stub the auditor + report persistence — no Chromium/LLM is launched.
    auditSpy = jest.spyOn(Auditor.prototype, 'audit')
      .mockImplementation((url) => Promise.resolve(cannedResult(url)));
    reportSpy = jest.spyOn(reportService, 'createReport')
      .mockResolvedValue({ id: 'r1' });
  });

  afterAll(async () => {
    auditSpy.mockRestore();
    reportSpy.mockRestore();
    if (originalOwnerFlag === undefined) delete process.env.OWNER_TOKEN_REQUIRED;
    else process.env.OWNER_TOKEN_REQUIRED = originalOwnerFlag;
    if (originalSsrfFlag === undefined) delete process.env.SSRF_BLOCK_PRIVATE;
    else process.env.SSRF_BLOCK_PRIVATE = originalSsrfFlag;
    await disconnect();
  });

  beforeEach(async () => {
    await truncateAll();
    auditSpy.mockClear();
    reportSpy.mockClear();
    delete process.env.OWNER_TOKEN_REQUIRED;
    delete process.env.SSRF_BLOCK_PRIVATE;
  });

  it('queues a batch and polls to terminal completed', async () => {
    const post = await request(app)
      .post('/api/batch')
      .send({ urls: ['https://a.example.com', 'https://b.example.com'] });
    expect(post.status).toBe(202);
    expect(post.body.jobId).toBeDefined();
    expect(post.body.status).toBe('queued');
    expect(post.body.statusUrl).toBe(`/api/status/${post.body.jobId}`);

    const res = await pollStatus(post.body.jobId);
    expect(res.body.status).toBe('completed');
    expect(res.body.totalUrls).toBe(2);
    expect(res.body.completedUrls).toBe(2);
    expect(res.body.results).toHaveLength(2);
    expect(res.body.results[0]).toMatchObject({ status: 'completed', reportId: 'r1', overallScore: 80, grade: 'B' });
    expect(auditSpy).toHaveBeenCalledTimes(2);
    expect(reportSpy).toHaveBeenCalledTimes(2);
  });

  it('blocks private targets per-URL without invoking the auditor', async () => {
    const post = await request(app)
      .post('/api/batch')
      .send({ urls: ['http://127.0.0.1/', 'https://public.example.com'] });
    expect(post.status).toBe(202);

    const res = await pollStatus(post.body.jobId);
    expect(auditSpy).toHaveBeenCalledTimes(1);
    expect(auditSpy).not.toHaveBeenCalledWith('http://127.0.0.1/');
    const blocked = res.body.results.find((r) => r.url === 'http://127.0.0.1/');
    expect(blocked).toBeDefined();
    expect(blocked.status).toBe('blocked');
    expect(blocked.error).toBeDefined();
    expect(res.body.status).toBe('partial');
  });

  it('returns 404 for unknown job id', async () => {
    const res = await request(app).get('/api/status/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('returns 404 cross-owner (two tokens, no existence leak)', async () => {
    process.env.OWNER_TOKEN_REQUIRED = '1';
    const cookieA = `${COOKIE_NAME}=${TOKEN_A}`;
    const cookieB = `${COOKIE_NAME}=${TOKEN_B}`;

    const post = await request(app)
      .post('/api/batch')
      .set('Cookie', cookieA)
      .send({ urls: ['https://owner.example.com'] });
    expect(post.status).toBe(202);

    const other = await request(app).get(`/api/status/${post.body.jobId}`).set('Cookie', cookieB);
    expect(other.status).toBe(404);
    expect(other.body.error).toBeDefined();

    const own = await pollStatus(post.body.jobId, cookieA);
    expect(own.status).toBe(200);
    expect(own.body.status).toBe('completed');
  });

  it('delivers webhook on terminal state (webhookStatus delivered)', async () => {
    process.env.SSRF_BLOCK_PRIVATE = '0';
    const { server, received, port } = await startHookServer((_req, res) => {
      res.statusCode = 200;
      res.end('ok');
    });
    try {
      const post = await request(app)
        .post('/api/batch')
        .send({ urls: ['https://hook.example.com'], webhook: `http://127.0.0.1:${port}/hook` });
      expect(post.status).toBe(202);

      const res = await pollStatus(post.body.jobId);
      expect(res.body.webhookStatus).toBe('delivered');
      expect(received).toHaveLength(1);
      expect(received[0].method).toBe('POST');
      const payload = JSON.parse(received[0].body);
      expect(payload.jobId).toBe(post.body.jobId);
      expect(TERMINAL).toContain(payload.status);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('tolerates webhook failure (webhookStatus failed, job still terminal)', async () => {
    process.env.SSRF_BLOCK_PRIVATE = '0';
    const { server, port } = await startHookServer((_req, res) => {
      res.statusCode = 500;
      res.end('boom');
    });
    try {
      const post = await request(app)
        .post('/api/batch')
        .send({ urls: ['https://hook-fail.example.com'], webhook: `http://127.0.0.1:${port}/hook` });
      expect(post.status).toBe(202);

      const res = await pollStatus(post.body.jobId);
      expect(res.body.status).toBe('completed');
      expect(res.body.webhookStatus).toBe('failed');
    } finally {
      await new Promise((r) => server.close(r));
    }
  });

  it('blocked-only job ends in failed status', async () => {
    const post = await request(app)
      .post('/api/batch')
      .send({ urls: ['http://127.0.0.1/'] });
    expect(post.status).toBe(202);

    const res = await pollStatus(post.body.jobId);
    expect(res.body.status).toBe('failed');
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].status).toBe('blocked');
    expect(auditSpy).not.toHaveBeenCalled();
  });
});
