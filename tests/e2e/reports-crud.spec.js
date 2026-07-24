const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('delete removes a report row', async ({ page }) => {
  const a = await seedReport({ url: 'https://keep.example.com' });
  await seedReport({ url: 'https://remove.example.com' });

  await page.goto('/app/reports');
  await expect(page.locator('.table-row')).toHaveCount(2);

  page.once('dialog', dialog => dialog.accept());
  await page.locator('.table-row', { hasText: 'remove.example.com' })
    .getByRole('button', { name: 'Delete' })
    .click();

  await expect(page.locator('.table-row')).toHaveCount(1);
  await expect(page.locator('.table-row').first()).toContainText('keep.example.com');
});

test('failed delete shows an error and keeps the row — no silent removal (invariant I-3)', async ({ page }) => {
  // I-3(a): a failed DELETE must NOT silently remove the row. Force a 500 on the
  // DELETE endpoint and assert the row stays AND a user-visible error surfaces.
  await seedReport({ url: 'https://stays.example.com' });

  await page.route('**/api/reports/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      return route.fulfill({ status: 500, body: 'Internal Server Error' });
    }
    // All other requests (the GET list, assets) pass through unchanged.
    return route.continue();
  });

  await page.goto('/app/reports');
  await expect(page.locator('.table-row')).toHaveCount(1);

  page.once('dialog', dialog => dialog.accept());
  await page.locator('.table-row', { hasText: 'stays.example.com' })
    .getByRole('button', { name: 'Delete' })
    .click();

  // The row must NOT be removed (no optimistic/silent removal on failure).
  await expect(page.locator('.table-row')).toHaveCount(1);
  await expect(page.locator('.table-row').first()).toContainText('stays.example.com');
  // A user-visible error banner surfaces the failure rather than swallowing it.
  await expect(page.locator('.error-message')).toBeVisible();
  await expect(page.locator('.error-message')).toContainText(/delete/i);
});

test('search filters reports by URL', async ({ page }) => {
  await seedReport({ url: 'https://foo.example.com' });
  await seedReport({ url: 'https://bar.example.com' });

  await page.goto('/app/reports');
  await expect(page.locator('.table-row')).toHaveCount(2);

  await page.locator('.search-input').fill('foo');
  await expect(page.locator('.table-row')).toHaveCount(1);
  await expect(page.locator('.table-row').first()).toContainText('foo.example.com');
});
