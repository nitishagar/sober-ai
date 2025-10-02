const { chromium } = require('playwright');
const SSRDetectionGatherer = require('../gatherers/ssr-detection');
const StructuredDataGatherer = require('../gatherers/structured-data');
const SemanticHTMLGatherer = require('../gatherers/semantic-html');
const ContentAnalysisGatherer = require('../gatherers/content-analysis');
const SSRReadinessAudit = require('../audits/ssr-readiness.audit');
const SchemaCoverageAudit = require('../audits/schema-coverage.audit');
const SemanticStructureAudit = require('../audits/semantic-structure.audit');
const ContentExtractabilityAudit = require('../audits/content-extractability.audit');
const LLMAnalyzer = require('../llm/analyzer');
const Scorer = require('./scorer');
const logger = require('../utils/logger');

class Auditor {
  constructor(config) {
    this.config = config;
    this.llm = new LLMAnalyzer();
    this.scorer = new Scorer(config.audits.weights);

    // Initialize gatherers
    this.gatherers = {
      ssr: new SSRDetectionGatherer(),
      structuredData: new StructuredDataGatherer(),
      semanticHTML: new SemanticHTMLGatherer(),
      contentAnalysis: new ContentAnalysisGatherer()
    };

    // Initialize audits
    this.audits = {
      ssrReadiness: new SSRReadinessAudit(),
      schemaCoverage: new SchemaCoverageAudit(),
      semanticStructure: new SemanticStructureAudit(),
      contentExtractability: new ContentExtractabilityAudit()
    };
  }

  async audit(url, progressCallback = null) {
    logger.info(`Starting audit for: ${url}`);
    const startTime = Date.now();

    try {
      // Phase 1: Gather data
      logger.info('Phase 1: Gathering data...');
      const gatheredData = await this.runGatherers(url);

      // Phase 2: Run audits
      logger.info('Phase 2: Running audits...');
      const auditResults = await this.runAudits(gatheredData);

      // Phase 3: Calculate scores
      logger.info('Phase 3: Calculating scores...');
      const scores = this.scorer.calculate(auditResults);

      // Phase 4: Generate LLM recommendations (only for failing audits)
      logger.info('Phase 4: Generating recommendations...');
      const recommendations = await this.generateRecommendations(auditResults, progressCallback);

      const duration = Date.now() - startTime;
      logger.info(`Audit completed in ${duration}ms`);

      return {
        url,
        timestamp: new Date().toISOString(),
        duration,
        scores,
        auditResults,
        recommendations,
        metadata: {
          detectedIndustry: gatheredData.structuredData.detected_industry,
          totalSchemas: gatheredData.structuredData.schemaCount,
          ssrEnabled: gatheredData.ssr.ssr_readiness_score > 70
        }
      };
    } catch (error) {
      logger.error(`Audit failed for ${url}:`, error);
      throw error;
    }
  }

  async runGatherers(url) {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'SoberAI-Optimizer/1.0 (AI Agent Website Auditor)'
    });

    const page = await context.newPage();

    try {
      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // SSR detection requires special handling (separate page loads)
      logger.info('Gathering SSR data...');
      const ssrData = await this.gatherers.ssr.gather(url);

      // Run other gatherers in parallel
      logger.info('Gathering other data in parallel...');
      const [structuredData, semanticData, contentData] = await Promise.all([
        this.gatherers.structuredData.gather(url, page),
        this.gatherers.semanticHTML.gather(url, page),
        this.gatherers.contentAnalysis.gather(url, page)
      ]);

      return {
        ssr: ssrData,
        structuredData,
        semanticHTML: semanticData,
        contentAnalysis: contentData
      };
    } finally {
      await browser.close();
    }
  }

  async runAudits(gatheredData) {
    logger.info('Running all audits...');

    return {
      ssrReadiness: this.audits.ssrReadiness.audit(gatheredData.ssr),
      schemaCoverage: this.audits.schemaCoverage.audit(gatheredData.structuredData),
      semanticStructure: this.audits.semanticStructure.audit(gatheredData.semanticHTML),
      contentExtractability: this.audits.contentExtractability.audit(gatheredData.contentAnalysis)
    };
  }

  async generateRecommendations(auditResults, progressCallback = null) {
    const recommendations = {};

    // Generate recommendations only for failing or warning audits
    for (const [auditName, result] of Object.entries(auditResults)) {
      if (result.severity !== 'pass') {
        logger.info(`Generating recommendations for ${auditName}...`);
        try {
          const onProgress = progressCallback ? (token) => {
            progressCallback(auditName, token);
          } : null;

          recommendations[auditName] = await this.llm.analyze(
            result,
            this.getAuditType(auditName),
            onProgress
          );
        } catch (error) {
          logger.error(`Failed to generate recommendations for ${auditName}:`, error);
          recommendations[auditName] = {
            error: 'Failed to generate recommendations',
            message: error.message
          };
        }
      }
    }

    return recommendations;
  }

  getAuditType(auditName) {
    const typeMap = {
      ssrReadiness: 'ssr_analysis',
      schemaCoverage: 'schema_recommendations',
      semanticStructure: 'semantic_improvements',
      contentExtractability: 'content_optimization'
    };
    return typeMap[auditName] || 'general';
  }
}

module.exports = Auditor;
