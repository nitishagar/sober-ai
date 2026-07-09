const request = require('supertest');
const app = require('../../src/api/server');
const { getPrisma, truncateAll, disconnect } = require('../helpers/db');
const { isolationActive, COOKIE_NAME } = require('../../src/api/middleware/owner-token');

// Seed a report row directly with the test helper's Prisma instance (single
// engine on the SQLite file — avoids "Response from the Engine was empty" when
// two PrismaClient instances share one SQLite DB).
function seedReport(prisma, url, score, ownerToken) {
  return prisma.report.create({
    data: {
      url,
      overallScore: score,
      grade: score >= 80 ? 'B' : 'C',
      ssrScore: score,
      schemaScore: score,
      semanticScore: score,
      contentScore: score,
      detectedIndustry: 'general',
      auditResults: JSON.stringify({ ssrReadiness: { score } }),
      duration: 1000,
      ownerToken: ownerToken || null
    }
  });
}

describe('Report isolation via ephemeral owner token (invariant G)', () => {
  const originalOwnerFlag = process.env.OWNER_TOKEN_REQUIRED;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    truncateAll();
    // Force isolation ON for these tests.
    process.env.OWNER_TOKEN_REQUIRED = '1';
    delete process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
  });

  afterAll(async () => {
    if (originalOwnerFlag === undefined) delete process.env.OWNER_TOKEN_REQUIRED;
    else process.env.OWNER_TOKEN_REQUIRED = originalOwnerFlag;
    process.env.NODE_ENV = originalNodeEnv;
    await disconnect();
  });

  it('isolationActive() is ON when OWNER_TOKEN_REQUIRED=1', () => {
    expect(isolationActive()).toBe(true);
  });

  it('issues a new owner token cookie when none is present', async () => {
    const res = await request(app).get('/api/reports');
    // A Set-Cookie header for sober_owner should be issued on first request.
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
    expect(cookieStr).toContain(`${COOKIE_NAME}=`);
    expect(cookieStr.toLowerCase()).toContain('httponly');
  });

  it('two different tokens cannot see each other\'s reports (list)', async () => {
    const tokenA = '11111111-1111-1111-1111-111111111111';
    const tokenB = '22222222-2222-2222-2222-222222222222';
    const cookieA = `${COOKIE_NAME}=${tokenA}`;
    const cookieB = `${COOKIE_NAME}=${tokenB}`;

    await seedReport(getPrisma(), 'https://a.example.com', 80, tokenA);
    await seedReport(getPrisma(), 'https://b.example.com', 65, tokenB);

    const resA = await request(app).get('/api/reports').set('Cookie', cookieA);
    expect(resA.body.reports).toHaveLength(1);
    expect(resA.body.reports[0].url).toBe('https://a.example.com');

    const resB = await request(app).get('/api/reports').set('Cookie', cookieB);
    expect(resB.body.reports).toHaveLength(1);
    expect(resB.body.reports[0].url).toBe('https://b.example.com');
  });

  it('getReport returns 404 when the report belongs to another token (no existence leak)', async () => {
    const tokenA = '11111111-1111-1111-1111-111111111111';
    const tokenB = '22222222-2222-2222-2222-222222222222';
    const report = await seedReport(getPrisma(), 'https://secret.example.com', 75, tokenA);

    // Token B cannot read token A's report → 404 (not 403).
    const res = await request(app)
      .get(`/api/reports/${report.id}`)
      .set('Cookie', `${COOKIE_NAME}=${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('deleteReport returns 404 for another token\'s report and does not delete it', async () => {
    const tokenA = '11111111-1111-1111-1111-111111111111';
    const tokenB = '22222222-2222-2222-2222-222222222222';
    const report = await seedReport(getPrisma(), 'https://keep.example.com', 75, tokenA);

    const res = await request(app)
      .delete(`/api/reports/${report.id}`)
      .set('Cookie', `${COOKIE_NAME}=${tokenB}`);
    expect(res.status).toBe(404);

    // Still readable by the owner.
    const prisma = getPrisma();
    const stillThere = await prisma.report.findUnique({ where: { id: report.id } });
    expect(stillThere).not.toBeNull();
  });

  it('compare returns 404 when one report belongs to another token', async () => {
    const tokenA = '11111111-1111-1111-1111-111111111111';
    const tokenB = '22222222-2222-2222-2222-222222222222';
    const r1 = await seedReport(getPrisma(), 'https://c1.example.com', 60, tokenA);
    const r2 = await seedReport(getPrisma(), 'https://c2.example.com', 90, tokenA);

    // Token B tries to compare two of token A's reports.
    const res = await request(app)
      .get(`/api/reports/compare/${r1.id}/${r2.id}`)
      .set('Cookie', `${COOKIE_NAME}=${tokenB}`);
    expect(res.status).toBe(404);
  });

  it('stats are scoped to the owner token', async () => {
    const tokenA = '11111111-1111-1111-1111-111111111111';
    const tokenB = '22222222-2222-2222-2222-222222222222';
    await seedReport(getPrisma(), 'https://a1.example.com', 85, tokenA);
    await seedReport(getPrisma(), 'https://a2.example.com', 70, tokenA);
    await seedReport(getPrisma(), 'https://b1.example.com', 60, tokenB);

    const resA = await request(app).get('/api/reports/stats').set('Cookie', `${COOKIE_NAME}=${tokenA}`);
    expect(resA.body.totalReports).toBe(2);

    const resB = await request(app).get('/api/reports/stats').set('Cookie', `${COOKIE_NAME}=${tokenB}`);
    expect(resB.body.totalReports).toBe(1);
  });
});

describe('Report isolation — null token mode (local/desktop, legacy)', () => {
  const originalOwnerFlag = process.env.OWNER_TOKEN_REQUIRED;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    truncateAll();
    // Isolation OFF: no flag and not production.
    delete process.env.OWNER_TOKEN_REQUIRED;
    delete process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });

  afterAll(async () => {
    if (originalOwnerFlag === undefined) delete process.env.OWNER_TOKEN_REQUIRED;
    else process.env.OWNER_TOKEN_REQUIRED = originalOwnerFlag;
    process.env.NODE_ENV = originalNodeEnv;
    await disconnect();
  });

  it('isolationActive() is OFF in development without OWNER_TOKEN_REQUIRED', () => {
    expect(isolationActive()).toBe(false);
  });

  it('null-token mode returns ALL reports (no scoping) and does not set a cookie', async () => {
    // Create reports directly with null ownerToken (legacy rows).
    await seedReport(getPrisma(), 'https://legacy1.example.com', 75, null);
    await seedReport(getPrisma(), 'https://legacy2.example.com', 75, null);

    const res = await request(app).get('/api/reports');
    expect(res.body.reports).toHaveLength(2);
    // No owner-token cookie issued when isolation is off.
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});
