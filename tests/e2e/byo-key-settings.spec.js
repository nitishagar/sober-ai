const { test, expect } = require('@playwright/test');

// Phase 6 — BYO-key frontend integration (invariant H): the browser holds the
// user's key in sessionStorage and never round-trips it through PUT /api/settings.

test('BYO mode toggle stores the key in sessionStorage, not on the server', async ({ page }) => {
  const putSettingsRequests = [];

  // Capture every PUT /api/settings so we can assert the key never leaves the browser.
  page.on('request', (req) => {
    if (req.method() === 'PUT' && req.url().includes('/api/settings')) {
      putSettingsRequests.push(req.postData());
    }
  });

  await page.goto('/settings');

  // Enable BYO mode via the toggle checkbox.
  const byoToggle = page.locator('input[type="checkbox"][aria-label="Toggle bring-your-own-key mode"]');
  await expect(byoToggle).toBeVisible();
  await byoToggle.check();

  // The BYO info banner appears.
  await expect(page.locator('.settings-message--info')).toContainText(/BYO mode is on/);

  // Enter a key + NVIDIA endpoint in BYO mode.
  const keyInput = page.locator('input[placeholder*="kept in this browser only"]');
  await keyInput.fill('my-nvidia-key-do-not-leak');

  const endpointInput = page.locator('input[placeholder="https://integrate.api.nvidia.com/v1"]');
  await endpointInput.fill('https://integrate.api.nvidia.com/v1');

  const modelInput = page.locator('input[placeholder*="llama-3.1-8b-instruct"]');
  await modelInput.fill('meta/llama-3.1-8b-instruct');

  // Save in BYO mode (client-side only).
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await expect(page.locator('.settings-message--success')).toContainText(/BYO settings saved/);

  // Assert the key is in sessionStorage under sober_byo.
  const stored = await page.evaluate(() => window.sessionStorage.getItem('sober_byo'));
  expect(stored).toBeTruthy();
  expect(stored).toContain('my-nvidia-key-do-not-leak');
  expect(stored).toContain('https://integrate.api.nvidia.com/v1');

  // CRITICAL (invariant H): no PUT /api/settings carried the key.
  for (const body of putSettingsRequests) {
    expect(body).not.toContain('my-nvidia-key-do-not-leak');
  }
});

test('BYO mode off (default) does not set the sober_byo_enabled flag', async ({ page }) => {
  await page.goto('/settings');
  // Default: BYO mode off → flag absent.
  const flag = await page.evaluate(() => window.sessionStorage.getItem('sober_byo_enabled'));
  expect(flag).toBeNull();
});
