const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('delete removes a report row', async ({ page }) => {
  const a = await seedReport({ url: 'https://keep.example.com' });
  await seedReport({ url: 'https://remove.example.com' });

  await page.goto('/reports');
  await expect(page.locator('.table-row')).toHaveCount(2);

  page.once('dialog', dialog => dialog.accept());
  await page.locator('.table-row', { hasText: 'remove.example.com' })
    .getByRole('button', { name: 'Delete' })
    .click();

  await expect(page.locator('.table-row')).toHaveCount(1);
  await expect(page.locator('.table-row').first()).toContainText('keep.example.com');
});

test('search filters reports by URL', async ({ page }) => {
  await seedReport({ url: 'https://foo.example.com' });
  await seedReport({ url: 'https://bar.example.com' });

  await page.goto('/reports');
  await expect(page.locator('.table-row')).toHaveCount(2);

  await page.locator('.search-input').fill('foo');
  await expect(page.locator('.table-row')).toHaveCount(1);
  await expect(page.locator('.table-row').first()).toContainText('foo.example.com');
});
