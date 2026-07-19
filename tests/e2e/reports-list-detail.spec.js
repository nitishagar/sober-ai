const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('lists reports and navigates to detail', async ({ page, baseURL }) => {
  const report = await seedReport({ url: 'https://list-test.example.com', overallScore: 88, grade: 'B' });

  await page.goto('/app/reports');
  // Row contains the URL text
  const row = page.getByText('list-test.example.com').first();
  await expect(row).toBeVisible();

  // Click the "View" link in the same row
  await page.locator(`a[href="/app/reports/${report.id}"]`).click();

  await expect(page).toHaveURL(new RegExp(`/app/reports/${report.id}$`));

  // Score text visible (overallScore = 88)
  await expect(page.locator('text=88').first()).toBeVisible();

  // Gauge SVGs are rendered (at least one circle)
  await expect(page.locator('svg circle').first()).toBeVisible();
});
