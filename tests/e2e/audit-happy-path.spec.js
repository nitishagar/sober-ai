const { test, expect } = require('@playwright/test');
const { truncateReports } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('submits a URL, streams progress, redirects to report', async ({ page }) => {
  await page.goto('/audit');
  await page.fill('input[type=url]', 'https://example.com');
  await page.click('button[type=submit]');

  // Progress bar appears
  await expect(page.locator('.progress-bar')).toBeVisible({ timeout: 5_000 });

  // Redirect to the real report created by the backend
  await page.waitForURL(/\/reports\/[A-Za-z0-9_-]+$/, { timeout: 30_000 });

  // Detail page renders gauges (SVG circles = score arc tracks)
  await expect(page.locator('svg circle').first()).toBeVisible();
});
