const { test, expect } = require('@playwright/test');

test('settings page exposes Anthropic provider option and fields', async ({ page }) => {
  await page.goto('/settings');

  const providerSelect = page.locator('select').first();
  await expect(providerSelect.locator('option[value="anthropic"]')).toHaveText('Anthropic (Claude)');

  await providerSelect.selectOption('anthropic');

  await expect(page.locator('label', { hasText: 'Anthropic API Key' })).toBeVisible();
  await expect(page.locator('input[placeholder="claude-haiku-4-5-20251001"]')).toBeVisible();
});
