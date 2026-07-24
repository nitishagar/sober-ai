const { test, expect } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => { await truncateReports(baseURL); });

test('compare from reports list via bulk-select', async ({ page }) => {
  const a = await seedReport({ url: 'https://a.example.com', overallScore: 90, grade: 'A' });
  const b = await seedReport({ url: 'https://b.example.com', overallScore: 60, grade: 'D' });

  await page.goto('/app/reports');
  const compareBtn = page.getByRole('button', { name: 'Compare Selected' });
  await expect(compareBtn).toBeDisabled();

  await page.locator(`input[aria-label="Select ${a.url}"]`).check();
  await page.locator(`input[aria-label="Select ${b.url}"]`).check();
  await expect(compareBtn).toBeEnabled();

  await compareBtn.click();
  await expect(page).toHaveURL(new RegExp(`/app/compare/${a.id}/${b.id}$`));

  await expect(page.locator('text=a.example.com').first()).toBeVisible();
  await expect(page.locator('text=b.example.com').first()).toBeVisible();
  // scoreDelta = 60 - 90 = -30
  await expect(page.locator('text=-30').first()).toBeVisible();
});

test('compare from report detail via picker', async ({ page }) => {
  const a = await seedReport({ url: 'https://x.example.com', overallScore: 80, grade: 'B' });
  const b = await seedReport({ url: 'https://y.example.com', overallScore: 70, grade: 'C' });

  await page.goto(`/app/reports/${a.id}`);
  await page.getByRole('button', { name: 'Compare with…' }).click();

  // Click the other report link in the picker
  await page.locator(`.compare-picker-list a[href="/app/compare/${a.id}/${b.id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/app/compare/${a.id}/${b.id}$`));
  await expect(page.locator('text=Deltas').first()).toBeVisible();
});

test('compare with unknown ids renders not-found branch', async ({ page }) => {
  await page.goto('/app/compare/bad1/bad2');
  await expect(page.locator('text=/not found/i').first()).toBeVisible();
});

test('compare surfaces the machineReadabilityDelta — all 5 categories (invariant I-1)', async ({ page }) => {
  // Seed distinct machineReadabilityScore so the 5th delta is non-zero and a
  // missing field would not be masked by a zero default.
  const a = await seedReport({
    url: 'https://mra.example.com', overallScore: 50, grade: 'C',
    machineReadabilityScore: 40
  });
  const b = await seedReport({
    url: 'https://mrb.example.com', overallScore: 60, grade: 'C',
    machineReadabilityScore: 75
  });

  await page.goto(`/app/compare/${a.id}/${b.id}`);
  await expect(page.locator('text=Deltas').first()).toBeVisible();

  // The "Machine Readability" row must render (6th DELTAS entry — I-1).
  await expect(page.locator('.compare-deltas')).toContainText('Machine Readability');
  // machineReadabilityDelta = 75 - 40 = +35.
  await expect(page.locator('.compare-deltas')).toContainText('+35');
});
