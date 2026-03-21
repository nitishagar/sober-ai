const request = require('supertest');
const app = require('../../src/api/server');
const { getPrisma, truncateAll, disconnect } = require('../helpers/db');

describe('Reports API', () => {
  beforeEach(truncateAll);
  afterAll(disconnect);

  it('GET /api/reports returns empty array initially', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    // Reports API returns { reports: [], pagination: {...} }
    const reports = res.body.reports !== undefined ? res.body.reports : res.body;
    expect(Array.isArray(reports)).toBe(true);
    expect(reports).toHaveLength(0);
  });

  it('GET /api/reports/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/reports/nonexistent-id');
    expect(res.status).toBe(404);
  });

  it('returns a report after seeding directly via Prisma', async () => {
    const prisma = getPrisma();
    const report = await prisma.report.create({
      data: {
        url: 'https://example.com',
        overallScore: 80,
        grade: 'B',
        ssrScore: 75,
        schemaScore: 70,
        semanticScore: 85,
        contentScore: 90,
        detectedIndustry: 'general',
        auditResults: JSON.stringify({ ssrReadiness: { score: 75 } }),
        duration: 5000
      }
    });

    const res = await request(app).get(`/api/reports/${report.id}`);
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://example.com');
    expect(res.body.overallScore).toBe(80);
  });
});
