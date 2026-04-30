const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('reports list supports sort, page-size, and CSV export', async ({ page }) => {
  await seedReport({ url: 'https://zed.example.com', overallScore: 95, grade: 'A' });
  await seedReport({ url: 'https://alpha.example.com', overallScore: 55, grade: 'D' });
  await seedReport({ url: 'https://mid.example.com', overallScore: 75, grade: 'C' });

  await page.goto('/reports');
  await expect(page.locator('.table-row')).toHaveCount(3);

  // Click Score header: asc
  const scoreHeader = page.locator('.sort-header', { hasText: /^Score/ });
  await scoreHeader.click();
  await expect.poll(async () => {
    const first = await page.locator('.table-row .score-badge').first().textContent();
    return first?.trim();
  }).toBe('55');

  // Click again: desc
  await scoreHeader.click();
  await expect.poll(async () => {
    const first = await page.locator('.table-row .score-badge').first().textContent();
    return first?.trim();
  }).toBe('95');

  // Page-size selector passes limit=10
  const reqWaiter = page.waitForRequest(req => req.url().includes('/api/reports?') && req.url().includes('limit=10'));
  await page.locator('.page-size-selector').selectOption('10');
  await reqWaiter;

  // CSV export
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  const fs = require('fs');
  const path = await download.path();
  const body = fs.readFileSync(path, 'utf8');
  expect(body.startsWith('URL,Score,Grade,Date')).toBe(true);
});
