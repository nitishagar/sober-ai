const { test, expect } = require('@playwright/test');

// Chrome holds SSE-flavoured fetch connections open indefinitely when intercepted
// via page.route (the Accept: text/event-stream header keeps the ReadableStream
// alive even for a finite body). Mocking at the browser level with addInitScript
// + new Response() creates a proper finite stream that reader.read() closes
// normally, which is what we need to exercise the reconnect branch in Audit.jsx.

test('reconnects to session stream after early close', async ({ page }) => {
  await page.addInitScript(() => {
    const _fetch = globalThis.fetch.bind(globalThis);

    // Build a finite ReadableStream that explicitly closes after emitting bytes.
    // new Response(string) in Chrome does not close the stream when the Accept
    // header was text/event-stream, because Chrome holds SSE connections open.
    // Using an explicit ReadableStream with controller.close() forces done:true.
    function sseStream(lines) {
      const body = lines.map(e => `data: ${JSON.stringify(e)}\n\n`).join('');
      const bytes = new TextEncoder().encode(body);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });
    }

    globalThis.fetch = async function (url, init) {
      const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : String(url));

      if (urlStr.includes('/api/health')) {
        return new Response(
          JSON.stringify({ status: 'ok', services: { ollama: 'connected' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Reconnect GET must be checked before the POST pattern (more specific path)
      if (urlStr.includes('/api/audit-progress/session/')) {
        return new Response(sseStream([
          { status: 'completed', message: 'Done', reportId: 'rpt-mock-1' },
        ]), { status: 200 });
      }

      // Initial POST: started + processing, then stream closes (no completed)
      if (urlStr.includes('/api/audit-progress')) {
        return new Response(sseStream([
          { status: 'started', sessionId: 'audit-test-1', message: 'Starting', progress: 5, phase: 1 },
          { status: 'processing', message: 'Gathering', progress: 30, phase: 1 },
        ]), { status: 200 });
      }

      if (urlStr.includes('/api/reports/rpt-mock-1')) {
        return new Response(
          JSON.stringify({
            id: 'rpt-mock-1', url: 'https://example.com', overallScore: 82, grade: 'B',
            createdAt: new Date().toISOString(), duration: 3000,
            ssrScore: 80, schemaScore: 70, semanticScore: 85, extractabilityScore: 90,
            machineReadabilityScore: 75, detectedIndustry: 'general',
            auditResults: '{}', recommendations: '{}',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return _fetch(url, init);
    };
  });

  await page.goto('/app/audit');
  await page.fill('input[type=url]', 'https://example.com');
  await page.click('button[type=submit]');

  await expect(page).toHaveURL(/\/app\/reports\/rpt-mock-1$/, { timeout: 15_000 });
});

// Cycle 3 (S9 decided: send) — the reconnect GET to session/.../stream must
// carry the same X-LLM-* BYO headers as the initial POST, or a BYO audit that
// disconnects resumes under the server default provider instead of the user's.
test('reconnect request carries X-LLM-* headers when BYO mode is on', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem('sober_byo_enabled', '1');
      window.sessionStorage.setItem('sober_byo', JSON.stringify({
        provider: 'openai',
        apiKey: 'byo-reconnect-key',
        endpoint: 'https://byo.example.com/v1',
        model: 'byo-model',
      }));
    } catch (_) { /* storage unavailable — test will fail loudly below */ }
    window.__fetchLog = [];
    const _fetch = globalThis.fetch.bind(globalThis);

    function sseStream(lines) {
      const body = lines.map(e => `data: ${JSON.stringify(e)}\n\n`).join('');
      const bytes = new TextEncoder().encode(body);
      return new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });
    }

    function record(urlStr, init) {
      window.__fetchLog.push({ url: urlStr, headers: { ...((init && init.headers) || {}) } });
    }

    globalThis.fetch = async function (url, init) {
      const urlStr = typeof url === 'string' ? url : (url instanceof URL ? url.href : String(url));

      if (urlStr.includes('/api/health')) {
        return new Response(
          JSON.stringify({ status: 'ok', services: { ollama: 'connected' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/api/audit-progress/session/')) {
        record(urlStr, init);
        return new Response(sseStream([
          { status: 'completed', message: 'Done', reportId: 'rpt-mock-1' },
        ]), { status: 200 });
      }

      if (urlStr.includes('/api/audit-progress')) {
        record(urlStr, init);
        return new Response(sseStream([
          { status: 'started', sessionId: 'audit-test-byo', message: 'Starting', progress: 5, phase: 1 },
          { status: 'processing', message: 'Gathering', progress: 30, phase: 1 },
        ]), { status: 200 });
      }

      if (urlStr.includes('/api/reports/rpt-mock-1')) {
        return new Response(
          JSON.stringify({
            id: 'rpt-mock-1', url: 'https://example.com', overallScore: 82, grade: 'B',
            createdAt: new Date().toISOString(), duration: 3000,
            ssrScore: 80, schemaScore: 70, semanticScore: 85, extractabilityScore: 90,
            machineReadabilityScore: 75, detectedIndustry: 'general',
            auditResults: '{}', recommendations: '{}',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return _fetch(url, init);
    };
  });

  await page.goto('/app/audit');
  await page.fill('input[type=url]', 'https://example.com');
  await page.click('button[type=submit]');

  await expect(page).toHaveURL(/\/app\/reports\/rpt-mock-1$/, { timeout: 15_000 });

  const log = await page.evaluate(() => window.__fetchLog);
  const initial = log.find(e => e.url.includes('/api/audit-progress') && !e.url.includes('/session/'));
  const reconnect = log.find(e => e.url.includes('/api/audit-progress/session/'));
  expect(initial).toBeDefined();
  expect(reconnect).toBeDefined();
  expect(initial.headers['X-LLM-API-Key']).toBe('byo-reconnect-key');
  expect(reconnect.headers['X-LLM-API-Key']).toBe('byo-reconnect-key');
  expect(reconnect.headers['X-LLM-Provider']).toBe('openai');
  expect(reconnect.headers['X-LLM-Endpoint']).toBe('https://byo.example.com/v1');
  expect(reconnect.headers['X-LLM-Model']).toBe('byo-model');
});
