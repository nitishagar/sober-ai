const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('re-audit button navigates to /audit with prefilled URL', async ({ page }) => {
  const report = await seedReport({ url: 'https://reaudit.example.com' });
  await page.goto(`/app/reports/${report.id}`);

  await page.getByRole('button', { name: 'Re-audit this URL' }).click();
  await expect(page).toHaveURL(/\/app\/audit$/);
  await expect(page.locator('input[type="url"]')).toHaveValue('https://reaudit.example.com');
});

test('compare picker fetches the report list once even when empty', async ({ page }) => {
  // Single-report DB: the filtered picker list is empty. The list must still
  // be fetched exactly once across repeated opens (loaded-flag, not
  // results-length gating).
  const report = await seedReport({ url: 'https://picker-once.example.com' });
  let listRequests = 0;
  page.on('request', (req) => {
    if (req.url().includes('/api/reports?limit=50')) listRequests += 1;
  });
  await page.goto(`/app/reports/${report.id}`);
  await page.getByRole('button', { name: 'Compare with…' }).click();
  await expect(page.locator('.compare-picker')).toBeVisible();
  await expect(page.locator('.compare-picker')).toContainText('No other reports available');
  await page.locator('.compare-picker').getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.compare-picker')).toHaveCount(0);
  await page.getByRole('button', { name: 'Compare with…' }).click();
  await expect(page.locator('.compare-picker')).toBeVisible();
  expect(listRequests).toBe(1);
});

test('download JSON exports the full report', async ({ page }) => {
  const report = await seedReport({ url: 'https://json-export.example.com', overallScore: 77 });
  await page.goto(`/app/reports/${report.id}`);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download JSON' }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const fs = require('fs');
  const body = fs.readFileSync(await download.path(), 'utf8');
  const parsed = JSON.parse(body);
  expect(parsed.id).toBe(report.id);
  expect(parsed.url).toBe('https://json-export.example.com');
});
