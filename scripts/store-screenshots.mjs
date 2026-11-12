#!/usr/bin/env node
/**
 * Capture Chrome Web Store screenshots (1280x800) against the canned e2e
 * backend (real frontend + real API, stubbed gatherers/LLM).
 *
 * Run: npm run store:screenshots
 * Output: assets/store/screenshots/01-landing.png … 04-extension-popup.png
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = 'http://127.0.0.1:3100';
const OUT = path.join(ROOT, 'assets/store/screenshots');

async function waitFor(url, timeoutMs) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch (_) { /* not up yet */ }
    if (Date.now() - start > timeoutMs) throw new Error('backend never came up: ' + url);
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function runAudit(url) {
  const res = await fetch(BACKEND + '/api/audit-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ url })
  });
  if (!res.ok) throw new Error('audit POST failed: ' + res.status);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.status === 'completed') return event.reportId;
          if (event.status === 'error') throw new Error('audit error: ' + event.message);
        } catch (err) {
          if (err.message.startsWith('audit error:')) throw err;
        }
      }
    }
    if (done) throw new Error('audit stream ended without completion');
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = spawn('node', ['tests/e2e/helpers/test-server.js'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await waitFor(BACKEND + '/api/health', 60000);
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

      await page.goto(BACKEND + '/', { waitUntil: 'networkidle' });
      await page.screenshot({ path: path.join(OUT, '01-landing.png') });

      await page.goto(BACKEND + '/app/audit', { waitUntil: 'networkidle' });
      await page.locator('input[type="url"]').fill('https://example.com');
      await page.screenshot({ path: path.join(OUT, '02-audit.png') });

      const reportId = await runAudit('https://example.com');
      await page.goto(BACKEND + '/app/reports/' + reportId, { waitUntil: 'networkidle' });
      await page.screenshot({ path: path.join(OUT, '03-report.png') });

      // Extension popup, driven live, centered for a clean store shot.
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.addInitScript(() => {
        window.chrome = {
          storage: {
            local: {
              get: (keys, cb) => cb({ backendUrl: 'http://127.0.0.1:3100' }),
              set: (obj, cb) => { if (cb) cb(); },
              remove: (keys, cb) => { if (cb) cb(); }
            }
          },
          tabs: {
            query: (q, cb) => cb([{ url: 'https://example.com' }]),
            create: () => {}
          },
          runtime: { openOptionsPage: () => {} },
          permissions: { contains: (o, cb) => cb(true), request: (o, cb) => cb(true) }
        };
      });
      const popup = await ctx.newPage();
      await popup.goto('file://' + ROOT + '/extension/popup.html');
      await popup.locator('#runBtn').click();
      await popup.locator('#result').waitFor({ state: 'visible', timeout: 120000 });
      await popup.addStyleTag({
        content: 'body{background:#e8eaed}.popup{margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.18)}'
      });
      await popup.screenshot({ path: path.join(OUT, '04-extension-popup.png') });
      await ctx.close();

      console.log('screenshots written to', OUT);
    } finally {
      await browser.close();
    }
  } finally {
    server.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
