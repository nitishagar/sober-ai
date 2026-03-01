const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ReportService {
  async createReport(auditResult) {
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
        detectedIndustry: auditResult.metadata.detectedIndustry,
        duration: auditResult.duration,
        auditResults: JSON.stringify(auditResult.auditResults),
        recommendations: auditResult.recommendations ? JSON.stringify(auditResult.recommendations) : null
      }
    });

    return report;
  }

  async getReports(options = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search } = options;

    const where = search ? {
      url: {
        contains: search
      }
    } : {};

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
          createdAt: true
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

  async getReport(reportId) {
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

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

  async deleteReport(reportId) {
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    await prisma.report.delete({
      where: { id: reportId }
    });

    console.log(`[Reports] Report ${reportId} deleted`);
  }

  async getReportStats() {
    const [totalReports, avgScore, scoreDistribution] = await Promise.all([
      prisma.report.count(),
      prisma.report.aggregate({
        _avg: { overallScore: true }
      }),
      prisma.report.groupBy({
        by: ['grade'],
        _count: { grade: true }
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

  async compareReports(reportId1, reportId2) {
    const [report1, report2] = await Promise.all([
      this.getReport(reportId1),
      this.getReport(reportId2)
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
        contentDelta: report2.contentScore - report1.contentScore
      }
    };
  }
}

module.exports = new ReportService();
