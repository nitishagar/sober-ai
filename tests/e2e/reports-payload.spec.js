// Reports payload pins (GET-only, 0 write POSTs): 5-score list payload and
// sort-fallback over real HTTP. Follows reports-sort-export.spec.js patterns
// (truncateReports + db-fixture seedReport in beforeEach).
const { test, expect, request } = require('@playwright/test');
const { truncateReports, seedReport } = require('./helpers/db-fixture');

test.beforeEach(async ({ baseURL }) => {
  await truncateReports(baseURL);
  await seedReport({ url: 'https://zed.example.com', overallScore: 95, grade: 'A', machineReadabilityScore: 77 });
  await seedReport({ url: 'https://alpha.example.com', overallScore: 55, grade: 'D', machineReadabilityScore: 61 });
  await seedReport({ url: 'https://mid.example.com', overallScore: 75, grade: 'C', machineReadabilityScore: 70 });
});

test('reports list items contain all 5 category scores', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  try {
    const res = await ctx.get('/api/reports');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = Array.isArray(body) ? body : body.reports;
    expect(list).toHaveLength(3);
    for (const item of list) {
      expect(typeof item.ssrScore).toBe('number');
      expect(typeof item.schemaScore).toBe('number');
      expect(typeof item.semanticScore).toBe('number');
      expect(typeof item.contentScore).toBe('number');
      expect(typeof item.machineReadabilityScore).toBe('number');
    }
  } finally {
    await ctx.dispose();
  }
});

test('reports list with hostile sort params falls back to default ordering (no throw)', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  try {
    const baseline = await (await ctx.get('/api/reports')).json();
    const res = await ctx.get('/api/reports?sortBy=nope&sortOrder=ASCENDING');
    expect(res.status()).toBe(200);
    const body = await res.json();
    const list = Array.isArray(body) ? body : body.reports;
    const baselineList = Array.isArray(baseline) ? baseline : baseline.reports;
    expect(list.map((r) => r.id)).toEqual(baselineList.map((r) => r.id));
  } finally {
    await ctx.dispose();
  }
});
