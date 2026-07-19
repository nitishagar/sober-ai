const { test, expect } = require('@playwright/test');

test('unknown routes render 404 page', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.locator('text=404').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
});

test('unknown report id still renders report-not-found branch', async ({ page }) => {
  await page.goto('/app/reports/does-not-exist-123');
  await expect(page.locator('text=/Report not found|not found/i').first()).toBeVisible();
});

test('unknown path under /app renders the 404 page via the nested catch-all', async ({ page }) => {
  // Exercises the nested <Route path="*"> under /app (App.jsx), distinct from
  // the top-level catch-all exercised by the /no-such-page test.
  await page.goto('/app/no-such-sub-page');
  await expect(page.locator('text=404').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible();
});
