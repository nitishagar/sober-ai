const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('re-audit button navigates to /audit with prefilled URL', async ({ page }) => {
  const report = await seedReport({ url: 'https://reaudit.example.com' });
  await page.goto(`/reports/${report.id}`);

  await page.getByRole('button', { name: 'Re-audit this URL' }).click();
  await expect(page).toHaveURL(/\/audit$/);
  await expect(page.locator('input[type="url"]')).toHaveValue('https://reaudit.example.com');
});

test('download JSON exports the full report', async ({ page }) => {
  const report = await seedReport({ url: 'https://json-export.example.com', overallScore: 77 });
  await page.goto(`/reports/${report.id}`);

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
