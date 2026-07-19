const { test, expect } = require('@playwright/test');

test.describe('LLM health banner', () => {
  test('hidden when Ollama connected', async ({ page }) => {
    await page.route('**/api/health', r => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', services: { ollama: 'connected' } }),
    }));
    await page.goto('/app/audit');
    await expect(page.locator('.llm-warning')).toHaveCount(0);
  });

  test('visible when Ollama disconnected; dismissable', async ({ page }) => {
    await page.route('**/api/health', r => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', services: { ollama: 'disconnected' } }),
    }));
    await page.goto('/app/audit');
    const banner = page.locator('.llm-warning');
    await expect(banner).toBeVisible();
    await banner.locator('button[aria-label="Dismiss"]').click();
    await expect(banner).toHaveCount(0);
  });
});
