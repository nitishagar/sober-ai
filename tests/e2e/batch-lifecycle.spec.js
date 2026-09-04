// Batch lifecycle e2e (API-driven, real HTTP over the canned harness).
//
// Limiter budget (G11 recount duty): this file = 3 write POSTs (happy 1 +
// webhook-fail 1 + no-webhook 1; unknown-id sends 0 POSTs); run total 4/30
// including the 1 baseline UI-driven POST in audit-happy-path.spec.js.
// Any future spec adding a real write POST must update this count.
//
// Batch URLs are example.com-class (validator-passing, never actually fetched
// — canned gatherers); NO 127.x batch URLs. Poll uses expect.poll with
// intervals [500], timeout 15000 (never fixed sleeps); observed drain is
// logged per test.
//
// Explicitly NOT covered here (see plan): terminal partial/failed via drain
// (unreachable canned — integration-covered), per-URL blocked (knob conflict
// — integration-covered), owner-mismatch (isolation OFF — integration-covered),
// 429 (shared-budget + neighbor-flake), 5s-abort webhook timeout branch
// (would eat the poll budget).
const { test, expect, request } = require('@playwright/test');
const http = require('http');
const { truncateReports } = require('./helpers/db-fixture');

const TERMINAL = ['completed', 'failed', 'partial'];
const WEBHOOK_FINAL = ['delivered', 'failed', 'skipped'];

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

// Per-test stub webhook receiver on 127.0.0.1 ephemeral port (port 0).
function startReceiver(statusCode) {
  return new Promise((resolve, reject) => {
    const received = [];
    const sockets = new Set();
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        received.push({ method: req.method, url: req.url, body });
        res.statusCode = statusCode;
        res.end(statusCode === 200 ? 'ok' : 'boom');
      });
    });
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, sockets, received, port: server.address().port }));
  });
}

// Destroy tracked sockets (or closeAllConnections) before awaiting close —
// undici fetch may hold a keep-alive socket that would hang server.close()
// until the 30s test timeout.
async function closeReceiver(server, sockets) {
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  } else {
    for (const socket of sockets) socket.destroy();
  }
  await new Promise((resolve) => server.close(resolve));
}

// G1: NEVER poll on status alone — job.status is set terminal BEFORE
// deliverWebhook, so the predicate must also require webhook finality.
async function pollJobTerminal(ctx, jobId) {
  const start = Date.now();
  let final = null;
  await expect.poll(async () => {
    const res = await ctx.get(`/api/status/${jobId}`);
    if (res.status() !== 200) return null;
    const body = await res.json();
    if (TERMINAL.includes(body.status) && WEBHOOK_FINAL.includes(body.webhookStatus)) {
      final = body;
      return `${body.status}:${body.webhookStatus}`;
    }
    return null;
  }, { intervals: [500], timeout: 15000 }).not.toBeNull();
  const drainMs = Date.now() - start;
  return { final, drainMs };
}

test('batch happy path: 2 URLs complete, reports persisted, webhook delivered', async ({ baseURL }) => {
  const { server, sockets, received, port } = await startReceiver(200);
  const ctx = await request.newContext({ baseURL });
  try {
    const post = await ctx.post('/api/batch', {
      data: { urls: ['https://a.example.com', 'https://b.example.com'], webhook: `http://127.0.0.1:${port}/hook` }
    });
    expect(post.status()).toBe(202);
    const created = await post.json();
    expect(created.jobId).toBeDefined();
    expect(created.statusUrl).toBe(`/api/status/${created.jobId}`);

    const { final, drainMs } = await pollJobTerminal(ctx, created.jobId);
    // eslint-disable-next-line no-console
    console.log(`[batch-lifecycle] happy-path drain ${drainMs}ms`);
    expect(final.status).toBe('completed');
    expect(final.webhookStatus).toBe('delivered');
    expect(final.results).toHaveLength(2);
    for (const entry of final.results) {
      expect(entry.status).toBe('completed');
      expect(entry.reportId).toBeDefined();
      const repRes = await ctx.get(`/api/reports/${entry.reportId}`);
      expect(repRes.status()).toBe(200);
      const report = await repRes.json();
      expect(report.overallScore).toBeDefined();
    }

    expect(received).toHaveLength(1);
    expect(received[0].method).toBe('POST');
    const payload = JSON.parse(received[0].body);
    expect(payload.jobId).toBe(created.jobId);
    expect(payload.status).toBe('completed');
  } finally {
    await closeReceiver(server, sockets);
    await ctx.dispose();
  }
});

test('batch tolerates webhook failure: job still completed, webhookStatus failed', async ({ baseURL }) => {
  const { server, sockets, port } = await startReceiver(500);
  const ctx = await request.newContext({ baseURL });
  try {
    const post = await ctx.post('/api/batch', {
      data: { urls: ['https://c.example.com', 'https://d.example.com'], webhook: `http://127.0.0.1:${port}/hook` }
    });
    expect(post.status()).toBe(202);
    const created = await post.json();

    const { final, drainMs } = await pollJobTerminal(ctx, created.jobId);
    // eslint-disable-next-line no-console
    console.log(`[batch-lifecycle] webhook-failure drain ${drainMs}ms`);
    expect(final.status).toBe('completed');
    expect(final.webhookStatus).toBe('failed');
    expect(final.results).toHaveLength(2);
    for (const entry of final.results) {
      expect(entry.status).toBe('completed');
    }
  } finally {
    await closeReceiver(server, sockets);
    await ctx.dispose();
  }
});

test('batch without webhook: terminal completed, webhookStatus skipped', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  try {
    const post = await ctx.post('/api/batch', {
      data: { urls: ['https://e.example.com', 'https://f.example.com'] }
    });
    expect(post.status()).toBe(202);
    const created = await post.json();

    const { final, drainMs } = await pollJobTerminal(ctx, created.jobId);
    // eslint-disable-next-line no-console
    console.log(`[batch-lifecycle] no-webhook drain ${drainMs}ms`);
    expect(final.status).toBe('completed');
    expect(final.webhookStatus).toBe('skipped');
  } finally {
    await ctx.dispose();
  }
});

// G4: unknown-id case starts zero receivers and sends zero POSTs — a stray
// listener or write here could mask the 404, so none is ever added.
test('batch status unknown id returns 404', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  try {
    const res = await ctx.get('/api/status/does-not-exist-123');
    expect(res.status()).toBe(404);
  } finally {
    await ctx.dispose();
  }
});
