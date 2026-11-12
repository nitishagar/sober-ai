#!/usr/bin/env node
/**
 * Render the SoberAI brand mark (assets/brand/sober-ai-logo.svg) to exact-size
 * PNGs for the web app, the Chrome extension, and the store listing.
 *
 * Run: npm run brand:icons
 * Requires: playwright + its chromium build (already repo devDependencies).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SVG_PATH = path.join(ROOT, 'assets/brand/sober-ai-logo.svg');

// [sizePx, outputs...] — one render per size, copied to every consumer.
const TARGETS = [
  [16, 'assets/brand/icons/icon-16.png', 'extension/icons/icon-16.png'],
  [48, 'assets/brand/icons/icon-48.png', 'extension/icons/icon-48.png'],
  [128, 'assets/brand/icons/icon-128.png', 'extension/icons/icon-128.png'],
  [180, 'assets/brand/icons/icon-180.png'],
];

async function main() {
  const svg = fs.readFileSync(SVG_PATH, 'utf8');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 1 });
    for (const [size, ...outputs] of TARGETS) {
      const fileUrl = 'data:text/html,' + encodeURIComponent(
        `<body style="margin:0"><div id="mark" style="width:${size}px;height:${size}px">${svg}</div></body>`
      );
      await page.goto(fileUrl);
      const png = await page.locator('#mark').screenshot({ omitBackground: false });
      for (const out of outputs) {
        const abs = path.join(ROOT, out);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, png);
        console.log(`wrote ${out} (${png.length} bytes)`);
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
