const { test, expect } = require('@playwright/test');

test('landing renders hero, command snippet, and Open-the-app CTA', async ({ page }) => {
  await page.goto('/');

  // Hero wordmark present
  await expect(page.locator('.landing-wordmark')).toBeVisible();

  // Terminal command snippet is present and contains the quick-start
  const snippet = page.locator('.landing-terminal-body code');
  await expect(snippet).toBeVisible();
  await expect(snippet).toContainText('git clone');
  await expect(snippet).toContainText('npm run electron:dev');

  // Primary "Open the app" CTA links to /app
  const cta = page.getByRole('link', { name: /open the app/i }).first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('href', '/app');

  // Bento feature cards render (the 5 scored categories)
  await expect(page.locator('.landing-card')).toHaveCount(5);
});

test('landing CTA navigates to the in-app Dashboard at /app', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /open the app/i }).first().click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator('nav')).toBeVisible();
});

test('dark landing styles do not bleed into the light app (INV-8)', async ({ page }) => {
  // Visit the dark landing first so any global state would have applied.
  await page.goto('/');
  await expect(page.locator('.landing')).toBeVisible();

  // Then navigate into the app. The named INV-8 failure is a global
  // body/html/:root dark override leaking into the app. We assert on `body`
  // (the surface whose `background` in index.css:36 is --bg-primary = #fff)
  // because a token-bearing element like .header would stay light even if
  // body leaked — a false negative. Body must stay white.
  await page.goto('/app');
  await expect(page.locator('.header')).toBeVisible();

  const bodyBg = await page.evaluate(() => {
    return getComputedStyle(document.body).backgroundColor;
  });
  // rgb(255, 255, 255) = #ffffff = --bg-primary (index.css:8,36).
  expect(bodyBg).toMatch(/rgb\(255,\s*255,\s*255\)/);
});
