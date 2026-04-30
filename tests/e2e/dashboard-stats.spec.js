const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('dashboard shows totals, grade distribution, and recent reports', async ({ page }) => {
  await seedReport({ url: 'https://one.example.com', overallScore: 95, grade: 'A' });
  await seedReport({ url: 'https://two.example.com', overallScore: 82, grade: 'B' });
  await seedReport({ url: 'https://three.example.com', overallScore: 55, grade: 'D' });

  await page.goto('/');
  await expect(page.locator('.stat-value').first()).toHaveText('3');

  await expect(page.locator('.grade-bar-row', { hasText: 'A' })).toBeVisible();
  await expect(page.locator('.grade-bar-row', { hasText: 'B' })).toBeVisible();
  await expect(page.locator('.grade-bar-row', { hasText: 'D' })).toBeVisible();

  const recentRows = page.locator('.recent-reports .report-row');
  await expect(recentRows).toHaveCount(3);
});
