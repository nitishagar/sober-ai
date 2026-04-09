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

  describe('GET /api/reports/compare/:id1/:id2', () => {
    async function seedReport(prisma, overrides) {
      return prisma.report.create({
        data: {
          url: 'https://example.com',
          overallScore: 70,
          grade: 'C',
          ssrScore: 60,
          schemaScore: 65,
          semanticScore: 70,
          contentScore: 75,
          detectedIndustry: 'general',
          auditResults: JSON.stringify({}),
          duration: 4000,
          ...overrides
        }
      });
    }

    it('returns positive scoreDelta when second report has higher score', async () => {
      const prisma = getPrisma();
      const report1 = await seedReport(prisma, { url: 'https://a.example.com', overallScore: 60, grade: 'D' });
      const report2 = await seedReport(prisma, { url: 'https://b.example.com', overallScore: 85, grade: 'B' });

      const res = await request(app).get(`/api/reports/compare/${report1.id}/${report2.id}`);
      expect(res.status).toBe(200);
      expect(res.body.comparison.scoreDelta).toBe(25);
    });

    it('returns negative scoreDelta when second report has lower score', async () => {
      const prisma = getPrisma();
      const report1 = await seedReport(prisma, { url: 'https://a.example.com', overallScore: 90, grade: 'A' });
      const report2 = await seedReport(prisma, { url: 'https://b.example.com', overallScore: 65, grade: 'D' });

      const res = await request(app).get(`/api/reports/compare/${report1.id}/${report2.id}`);
      expect(res.status).toBe(200);
      expect(res.body.comparison.scoreDelta).toBe(-25);
    });

    it('response includes both report objects with correct ids and scores', async () => {
      const prisma = getPrisma();
      const report1 = await seedReport(prisma, { url: 'https://first.example.com', overallScore: 55, grade: 'F' });
      const report2 = await seedReport(prisma, { url: 'https://second.example.com', overallScore: 80, grade: 'B' });

      const res = await request(app).get(`/api/reports/compare/${report1.id}/${report2.id}`);
      expect(res.status).toBe(200);

      expect(res.body.report1.id).toBe(report1.id);
      expect(res.body.report1.overallScore).toBe(55);

      expect(res.body.report2.id).toBe(report2.id);
      expect(res.body.report2.overallScore).toBe(80);
    });

    it('response includes all 5 delta fields in comparison object', async () => {
      const prisma = getPrisma();
      const report1 = await seedReport(prisma, {
        overallScore: 60, ssrScore: 50, schemaScore: 55, semanticScore: 65, contentScore: 70
      });
      const report2 = await seedReport(prisma, {
        overallScore: 80, ssrScore: 75, schemaScore: 70, semanticScore: 85, contentScore: 90
      });

      const res = await request(app).get(`/api/reports/compare/${report1.id}/${report2.id}`);
      expect(res.status).toBe(200);

      const { comparison } = res.body;
      expect(comparison).toHaveProperty('scoreDelta');
      expect(comparison).toHaveProperty('ssrDelta');
      expect(comparison).toHaveProperty('schemaDelta');
      expect(comparison).toHaveProperty('semanticDelta');
      expect(comparison).toHaveProperty('contentDelta');

      expect(comparison.ssrDelta).toBe(25);
      expect(comparison.schemaDelta).toBe(15);
      expect(comparison.semanticDelta).toBe(20);
      expect(comparison.contentDelta).toBe(20);
    });

    it('returns 404 when one report does not exist', async () => {
      const prisma = getPrisma();
      const report = await seedReport(prisma, { overallScore: 70 });

      const res = await request(app).get(`/api/reports/compare/${report.id}/nonexistent-id`);
      expect(res.status).toBe(404);
    });
  });
});
