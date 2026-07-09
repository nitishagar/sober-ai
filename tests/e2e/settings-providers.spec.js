const { test, expect } = require('@playwright/test');

test('settings page exposes Anthropic provider option and fields', async ({ page }) => {
  await page.goto('/settings');

  const providerSelect = page.locator('select').first();
  await expect(providerSelect.locator('option[value="anthropic"]')).toHaveText('Anthropic (Claude)');

  await providerSelect.selectOption('anthropic');

  await expect(page.locator('label', { hasText: 'Anthropic API Key' })).toBeVisible();
  await expect(page.locator('input[placeholder="claude-haiku-4-5-20251001"]')).toBeVisible();
});

test('settings page exposes OpenAI custom Endpoint field for NVIDIA NIM (Phase 1)', async ({ page }) => {
  await page.goto('/settings');

  const providerSelect = page.locator('select').first();
  await providerSelect.selectOption('openai');

  // The Endpoint field renders and defaults to the OpenAI API placeholder.
  await expect(page.locator('label', { hasText: 'Endpoint' })).toBeVisible();
  const endpointInput = page.locator('input[placeholder="https://api.openai.com/v1"]');
  await expect(endpointInput).toBeVisible();

  // The NVIDIA NIM hint is shown so users know what value to enter.
  // Scope to the endpoint field's parent to avoid matching the BYO toggle hint.
  const endpointField = endpointInput.locator('xpath=ancestor::div[contains(@class,"settings-field")]');
  await expect(endpointField.locator('.settings-hint')).toContainText('integrate.api.nvidia.com');
});
