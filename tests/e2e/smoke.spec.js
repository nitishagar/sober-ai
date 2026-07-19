const { test, expect } = require('@playwright/test');

test('app shell loads at /app', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveTitle(/SoberAI|Sober/i);
  await expect(page.locator('nav')).toBeVisible();
});

test('document head carries required metadata (INV-9)', async ({ page }) => {
  await page.goto('/app');
  // Title beyond the bare default.
  await expect(page).toHaveTitle(/SoberAI/);
  // Meta description present and non-empty.
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description).toBeTruthy();
  expect(description.length).toBeGreaterThan(10);
  // OpenGraph + twitter tags required by INV-9.
  await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:description"]')).toHaveCount(1);
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
  // theme-color present.
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(1);
  // Favicon link resolves (non-empty href).
  const favicon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(favicon).toBeTruthy();
});
