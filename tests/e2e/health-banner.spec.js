const { test, expect } = require('@playwright/test');

test.describe('LLM health banner', () => {
  test('hidden when the configured provider is ready', async ({ page }) => {
    await page.route('**/api/health', r => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', services: { ollama: 'unreachable', llm_provider: 'openai', llm: 'configured' } }),
    }));
    await page.goto('/app/audit');
    await expect(page.locator('.llm-warning')).toHaveCount(0);
  });

  test('visible with key guidance when no API key is configured; dismissable', async ({ page }) => {
    await page.route('**/api/health', r => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', services: { ollama: 'unreachable', llm_provider: 'openai', llm: 'not_configured' } }),
    }));
    await page.goto('/app/audit');
    const banner = page.locator('.llm-warning');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('AI recommendations need an API key');
    await expect(banner.locator('a[href="/app/settings"]')).toBeVisible();
    await banner.locator('button[aria-label="Dismiss"]').click();
    await expect(banner).toHaveCount(0);
  });

  test('visible with Ollama guidance when ollama_local is unreachable', async ({ page }) => {
    await page.route('**/api/health', r => r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', services: { ollama: 'unreachable', llm_provider: 'ollama_local', llm: 'unreachable' } }),
    }));
    await page.goto('/app/audit');
    const banner = page.locator('.llm-warning');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Ollama not detected');
  });
});
