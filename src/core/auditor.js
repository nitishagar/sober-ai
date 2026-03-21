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
  constructor(config, providerSettings = null) {
    this.config = config;
    this.llm = new LLMAnalyzer(null, providerSettings);
    this.scorer = new Scorer(config.audits.weights);

    this.gatherers = {
      ssr: new SSRDetectionGatherer(),
      structuredData: new StructuredDataGatherer(),
      semanticHTML: new SemanticHTMLGatherer(),
      contentAnalysis: new ContentAnalysisGatherer()
    };

    this.audits = {
      ssrReadiness: new SSRReadinessAudit(),
      schemaCoverage: new SchemaCoverageAudit(),
      semanticStructure: new SemanticStructureAudit(),
      contentExtractability: new ContentExtractabilityAudit()
    };
  }

  normalizeProgressHandlers(progressHandlers = null) {
    if (!progressHandlers) {
      return {
        onPhase: () => {},
        onStep: () => {},
        onLLMToken: () => {}
      };
    }

    // Backward compatibility for old signature: audit(url, llmProgressCallback)
    if (typeof progressHandlers === 'function') {
      return {
        onPhase: () => {},
        onStep: () => {},
        onLLMToken: progressHandlers
      };
    }

    return {
      onPhase: typeof progressHandlers.onPhase === 'function' ? progressHandlers.onPhase : () => {},
      onStep: typeof progressHandlers.onStep === 'function' ? progressHandlers.onStep : () => {},
      onLLMToken: typeof progressHandlers.onLLMToken === 'function' ? progressHandlers.onLLMToken : () => {}
    };
  }

  async audit(url, progressHandlers = null) {
    logger.info(`Starting audit for: ${url}`);
    const startTime = Date.now();
    const handlers = this.normalizeProgressHandlers(progressHandlers);

    try {
      handlers.onPhase(1, 'Gathering website data...');
      logger.info('Phase 1: Gathering data...');
      const gatheredData = await this.runGatherers(url, handlers.onStep);

      handlers.onPhase(2, 'Running audits...');
      logger.info('Phase 2: Running audits...');
      const auditResults = await this.runAudits(gatheredData, handlers.onStep);

      handlers.onPhase(3, 'Calculating scores...');
      logger.info('Phase 3: Calculating scores...');
      const scores = this.scorer.calculate(auditResults);

      handlers.onPhase(4, 'Generating AI recommendations...');
      logger.info('Phase 4: Generating recommendations...');
      const recommendations = await this.generateRecommendations(auditResults, handlers.onLLMToken, handlers.onStep);

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

  async runGatherers(url, onStep = () => {}) {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
      userAgent: 'SoberAI-Optimizer/1.0 (AI Agent Website Auditor)'
    });

    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      onStep({ phase: 1, step: 'ssr', message: 'Analyzing server-side rendering...' });
      logger.info('Gathering SSR data...');
      const ssrData = await this.gatherers.ssr.gather(url, browser);

      onStep({ phase: 1, step: 'structuredData', message: 'Analyzing structured data...' });
      onStep({ phase: 1, step: 'semanticHTML', message: 'Analyzing semantic HTML...' });
      onStep({ phase: 1, step: 'contentAnalysis', message: 'Analyzing content...' });
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

  async runAudits(gatheredData, onStep = () => {}) {
    logger.info('Running all audits...');

    const results = {
      ssrReadiness: this.audits.ssrReadiness.audit(gatheredData.ssr),
      schemaCoverage: this.audits.schemaCoverage.audit(gatheredData.structuredData),
      semanticStructure: this.audits.semanticStructure.audit(gatheredData.semanticHTML),
      contentExtractability: this.audits.contentExtractability.audit(gatheredData.contentAnalysis)
    };

    Object.keys(results).forEach((auditName) => {
      onStep({ phase: 2, step: auditName, message: `Completed ${auditName} audit` });
    });

    return results;
  }

  async generateRecommendations(auditResults, onLLMToken = () => {}, onStep = () => {}) {
    const failingAudits = Object.entries(auditResults)
      .filter(([_, result]) => result.severity !== 'pass');

    if (failingAudits.length === 0) return {};

    onStep({ phase: 4, step: 'llm', message: `Generating ${failingAudits.length} AI recommendations...` });

    const results = await Promise.all(
      failingAudits.map(async ([auditName, result]) => {
        logger.info(`Generating recommendations for ${auditName}...`);
        try {
          const progressHandler = (token) => onLLMToken(auditName, token);
          const rec = await this.llm.analyze(
            result,
            this.getAuditType(auditName),
            progressHandler
          );
          return [auditName, rec];
        } catch (error) {
          logger.error(`Failed to generate recommendations for ${auditName}:`, error);
          return [auditName, {
            error: 'Failed to generate recommendations',
            message: error.message
          }];
        }
      })
    );

    return Object.fromEntries(results);
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
