const { request } = require('@playwright/test');

async function truncateReports(baseURL) {
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.get('/api/reports');
  const body = await res.json();
  const list = Array.isArray(body) ? body : (body.reports || []);
  for (const r of list) {
    await ctx.delete(`/api/reports/${r.id}`);
  }
  await ctx.dispose();
}

async function seedReport(overrides = {}) {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    return await prisma.report.create({
      data: {
        url: 'https://seed.example.com',
        overallScore: 82,
        grade: 'B',
        ssrScore: 80,
        schemaScore: 70,
        semanticScore: 85,
        contentScore: 90,
        detectedIndustry: 'general',
        duration: 1234,
        auditResults: '{}',
        recommendations: '{}',
        ...overrides,
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { truncateReports, seedReport };
