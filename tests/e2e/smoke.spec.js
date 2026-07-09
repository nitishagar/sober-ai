const { test, expect } = require('@playwright/test');

test('app shell loads at /', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SoberAI|Sober/i);
  await expect(page.locator('nav')).toBeVisible();
});
