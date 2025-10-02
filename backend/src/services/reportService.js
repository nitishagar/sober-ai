const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class ReportService {
  async createReport(userId, auditResult) {
    console.log(`[Reports] Creating report for user ${userId}, URL: ${auditResult.url}`);

    const report = await prisma.report.create({
      data: {
        userId,
        url: auditResult.url,
        overallScore: auditResult.scores.overall,
        grade: auditResult.scores.grade,
        ssrScore: auditResult.auditResults.ssrReadiness.score,
        schemaScore: auditResult.auditResults.schemaCoverage.score,
        semanticScore: auditResult.auditResults.semanticStructure.score,
        contentScore: auditResult.auditResults.contentExtractability.score,
        detectedIndustry: auditResult.metadata.detectedIndustry,
        duration: auditResult.duration,
        auditResults: auditResult.auditResults,
        recommendations: auditResult.recommendations || null
      }
    });

    return report;
  }

  async getReports(userId, options = {}) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search } = options;

    const where = {
      userId,
      ...(search && {
        url: {
          contains: search,
          mode: 'insensitive'
        }
      })
    };

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

  async getReport(reportId, userId) {
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId
      }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return report;
  }

  async deleteReport(reportId, userId) {
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        userId
      }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    await prisma.report.delete({
      where: { id: reportId }
    });

    console.log(`[Reports] Report ${reportId} deleted by user ${userId}`);
  }

  async getReportStats(userId) {
    const [totalReports, avgScore, scoreDistribution] = await Promise.all([
      prisma.report.count({ where: { userId } }),
      prisma.report.aggregate({
        where: { userId },
        _avg: { overallScore: true }
      }),
      prisma.report.groupBy({
        by: ['grade'],
        where: { userId },
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

  async compareReports(reportId1, reportId2, userId) {
    const [report1, report2] = await Promise.all([
      this.getReport(reportId1, userId),
      this.getReport(reportId2, userId)
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
