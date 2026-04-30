const { test, expect } = require('@playwright/test');

test('unknown routes render 404 page', async ({ page }) => {
  await page.goto('/no-such-page');
  await expect(page.locator('text=404').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /back to dashboard/i })).toBeVisible();
});

test('unknown report id still renders report-not-found branch', async ({ page }) => {
  await page.goto('/reports/does-not-exist-123');
  await expect(page.locator('text=/Report not found|not found/i').first()).toBeVisible();
});
