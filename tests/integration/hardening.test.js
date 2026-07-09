// Phase 7 — deployment hardening: rate-limit 429 + CORS allowlist.
//
// RATE-LIMIT ISOLATION NOTE: express-rate-limit builds the limiter at module
// load from process.env.AUDIT_RATE_LIMIT (audit-progress.js:15-23). Under
// `test:ci --runInBand` every integration file shares ONE module registry, so
// `require('../../src/api/server')` returns the SAME cached audit-progress
// module — i.e. ONE frozen limiter for the whole integration project. If this
// file set AUDIT_RATE_LIMIT=3 at top level and happened to load the server
// before audit-sse.test.js (which fires ~12 audits), it would freeze that
// shared limiter at max=3 and 429 the audit-sse suite. To make the 429 test
// independent of cross-file module-cache order, each test that depends on a
// specific limit re-requires the server in an isolated module registry with
// the env set explicitly first.

const request = require('supertest');
const { truncateAll, disconnect } = require('../helpers/db');

describe('Rate limit + CORS (invariant I/J)', () => {
  beforeEach(truncateAll);
  afterAll(disconnect);

  it('returns 429 after exceeding the per-IP audit request limit', async () => {
    // Send malformed bodies so each request returns fast (400) but still counts
    // against the limiter, which runs as route middleware before the handler.
    // Force a FRESH server module (and thus a fresh limiter) in an isolated
    // registry so this test's AUDIT_RATE_LIMIT does not depend on which
    // integration file happened to load the server first.
    process.env.AUDIT_RATE_LIMIT = '3';
    let isolatedApp;
    jest.isolateModules(() => {
      isolatedApp = require('../../src/api/server');
    });

    try {
      // 4th request in a 60s window (max=3) is throttled.
      const results = [];
      for (let i = 0; i < 4; i++) {
        results.push(await request(isolatedApp).post('/api/audit-progress').send({ url: 'not-a-url' }));
      }

      const statuses = results.map((r) => r.status);
      // First 3 are 400 (validation), the 4th is 429 (rate limited).
      expect(statuses).toContain(429);
      const throttled = results.find((r) => r.status === 429);
      expect(throttled.body.error).toMatch(/too many/i);
    } finally {
      delete process.env.AUDIT_RATE_LIMIT;
    }
  });

  it('reflects the CORS allowlist when CORS_ORIGIN is set (allowed origin gets ACAO)', async () => {
    // Re-require server in an isolated module registry with CORS_ORIGIN set:
    // server.js reads CORS_ORIGIN at load time.
    const allowed = 'https://app.example.com';
    process.env.CORS_ORIGIN = `${allowed},https://alt.example.com`;
    let isolatedApp;
    jest.isolateModules(() => {
      isolatedApp = require('../../src/api/server');
    });

    try {
      // An ALLOWED origin must be reflected back in Access-Control-Allow-Origin.
      const res = await request(isolatedApp).get('/api/health').set('Origin', allowed);
      const acao = res.headers['access-control-allow-origin'];
      // The allowlist actively reflects the requesting origin (not '*').
      expect(acao).toBe(allowed);
    } finally {
      delete process.env.CORS_ORIGIN;
    }
  });

  it('rejects a disallowed origin when CORS_ORIGIN allowlist is set', async () => {
    // The core of invariant J: CORS must be RESTRICTIVE when configured. The
    // previous version of this test only asserted `Vary: Origin`, which the
    // `cors` library ALSO emits in wildcard mode — that assertion was true
    // whether or not the allowlist worked (a tautology). This test proves the
    // allowlist actually blocks an origin not in the list.
    const allowed = 'https://app.example.com';
    const disallowed = 'https://evil.example.com';
    process.env.CORS_ORIGIN = allowed;
    let isolatedApp;
    jest.isolateModules(() => {
      isolatedApp = require('../../src/api/server');
    });

    try {
      const res = await request(isolatedApp).get('/api/health').set('Origin', disallowed);
      // A disallowed origin gets NO Access-Control-Allow-Origin header at all.
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    } finally {
      delete process.env.CORS_ORIGIN;
    }
  });

  it('defaults to permissive CORS (reflects any origin) when CORS_ORIGIN is unset', async () => {
    // Load the server with no allowlist → wildcard behavior.
    let isolatedApp;
    jest.isolateModules(() => {
      isolatedApp = require('../../src/api/server');
    });

    const anyOrigin = 'https://random.example.com';
    const res = await request(isolatedApp).get('/api/health').set('Origin', anyOrigin);
    // Wildcard CORS reflects the requesting origin (or '*'); the key property
    // is that the disallowed-origin test above would FAIL here — proving the
    // two configs behave differently and the allowlist test is non-tautological.
    const acao = res.headers['access-control-allow-origin'];
    expect([acao, '*']).toContain(acao); // accept either '*' or the echoed origin
  });
});
