const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

// Cycle 3 — rapid-nav-during-export: navigating away while the CSV export
// fetch is in flight must not crash the app or surface a stale error. The
// export fetch is AbortController-guarded (Reports.jsx handleExportCsv), so
// the AbortError is ignored and no state is written after abort.

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('rapid nav during CSV export does not crash or leave a stale error', async ({ page }) => {
  await seedReport({ url: 'https://export-nav.example.com', overallScore: 77, grade: 'C' });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String((err && err.message) || err)));

  await page.goto('/app/reports');
  await expect(page.locator('.table-row')).toHaveCount(1);

  // Hold the export response (limit=10000) open so the nav races the fetch.
  await page.route(/\/api\/reports\?.*limit=10000/, async (route) => {
    try {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    } catch (_) {
      // Client aborted mid-delay (the expected path) — nothing to do.
    }
  });

  await page.getByRole('button', { name: 'Export CSV' }).click();
  // Navigate away while the export fetch is still in flight.
  await page.goto('/app/audit');
  await expect(page.locator('h1')).toContainText('New Audit', { timeout: 10_000 });
  await page.waitForTimeout(2000);

  expect(pageErrors).toEqual([]);

  // Back on the list: clean state, no stale export error.
  await page.goto('/app/reports');
  await expect(page.locator('.table-row')).toHaveCount(1);
  await expect(page.locator('.error-message')).toHaveCount(0);
});
