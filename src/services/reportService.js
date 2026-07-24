const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ReportService {
  async createReport(auditResult, ownerToken = null) {
    console.log(`[Reports] Creating report for URL: ${auditResult.url}`);

    const report = await prisma.report.create({
      data: {
        url: auditResult.url,
        overallScore: auditResult.scores.overall,
        grade: auditResult.scores.grade,
        ssrScore: auditResult.auditResults.ssrReadiness.score,
        schemaScore: auditResult.auditResults.schemaCoverage.score,
        semanticScore: auditResult.auditResults.semanticStructure.score,
        contentScore: auditResult.auditResults.contentExtractability.score,
        machineReadabilityScore: auditResult.auditResults.machineReadability?.score ?? 0,
        detectedIndustry: auditResult.metadata.detectedIndustry,
        duration: auditResult.duration,
        auditResults: JSON.stringify(auditResult.auditResults),
        recommendations: auditResult.recommendations ? JSON.stringify(auditResult.recommendations) : null,
        ownerToken: ownerToken || null
      }
    });

    return report;
  }

  async getReports(options = {}, ownerToken = null) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search } = options;

    const where = {};
    if (search) {
      where.url = { contains: search };
    }
    // Scope to the owner token when isolation is active (invariant G).
    // null ownerToken → no filter (legacy/global visibility for local mode).
    if (ownerToken) {
      where.ownerToken = ownerToken;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          url: true,
          overallScore: true,
          grade: true,
          detectedIndustry: true,
          duration: true,
          createdAt: true,
          machineReadabilityScore: true
        }
      }),
      prisma.report.count({ where })
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getReport(reportId, ownerToken = null) {
    // findUnique doesn't support compound filters on nullable columns cleanly, so
    // use findFirst with the ownerToken in the where clause. A non-matching token
    // returns null → 'Report not found' (no existence leak — invariant G edge).
    const where = { id: reportId };
    if (ownerToken) {
      where.ownerToken = ownerToken;
    }
    const report = await prisma.report.findFirst({ where });

    if (!report) {
      throw new Error('Report not found');
    }

    // Parse JSON strings back to objects
    return {
      ...report,
      auditResults: typeof report.auditResults === 'string' ? JSON.parse(report.auditResults) : report.auditResults,
      recommendations: report.recommendations && typeof report.recommendations === 'string'
        ? JSON.parse(report.recommendations)
        : report.recommendations
    };
  }

  async deleteReport(reportId, ownerToken = null) {
    // Reuse getReport so ownership is enforced (404 on mismatch, not 403).
    await this.getReport(reportId, ownerToken);

    await prisma.report.delete({
      where: { id: reportId }
    });

    console.log(`[Reports] Report ${reportId} deleted`);
  }

  async getReportStats(ownerToken = null) {
    const where = ownerToken ? { ownerToken } : {};

    const [totalReports, avgScore, scoreDistribution] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.aggregate({
        _avg: { overallScore: true },
        where
      }),
      prisma.report.groupBy({
        by: ['grade'],
        _count: { grade: true },
        where
      })
    ]);

    return {
      totalReports,
      averageScore: Math.round(avgScore._avg.overallScore || 0),
      gradeDistribution: scoreDistribution.reduce((acc, item) => {
        acc[item.grade] = item._count.grade;
        return acc;
      }, {})
    };
  }

  async compareReports(reportId1, reportId2, ownerToken = null) {
    // getReport enforces ownership for each (404 on mismatch — no existence leak).
    const [report1, report2] = await Promise.all([
      this.getReport(reportId1, ownerToken),
      this.getReport(reportId2, ownerToken)
    ]);

    return {
      report1: {
        id: report1.id,
        url: report1.url,
        overallScore: report1.overallScore,
        grade: report1.grade,
        createdAt: report1.createdAt
      },
      report2: {
        id: report2.id,
        url: report2.url,
        overallScore: report2.overallScore,
        grade: report2.grade,
        createdAt: report2.createdAt
      },
      comparison: {
        scoreDelta: report2.overallScore - report1.overallScore,
        ssrDelta: report2.ssrScore - report1.ssrScore,
        schemaDelta: report2.schemaScore - report1.schemaScore,
        semanticDelta: report2.semanticScore - report1.semanticScore,
        contentDelta: report2.contentScore - report1.contentScore,
        machineReadabilityDelta: report2.machineReadabilityScore - report1.machineReadabilityScore
      }
    };
  }
}

module.exports = new ReportService();
