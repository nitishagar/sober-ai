const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('audit form populates datalist from recent reports', async ({ page }) => {
  await seedReport({ url: 'https://a.example.com' });
  await seedReport({ url: 'https://b.example.com' });
  await seedReport({ url: 'https://c.example.com' });

  await page.goto('/audit');

  const input = page.locator('input[type="url"]');
  await expect(input).toHaveAttribute('list', 'recent-urls');

  const count = await page.locator('datalist#recent-urls option').count();
  expect(count).toBe(3);
});
