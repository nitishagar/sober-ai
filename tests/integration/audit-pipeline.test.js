/**
 * Tier 2: Full pipeline integration test.
 * Real: Auditor, 4 audit classes, Scorer, ReportService (SQLite)
 * Stubbed: runGatherers (canned HTML data), Ollama LLM (via HTTP stub on port 11435)
 */

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const Auditor = require('../../src/core/auditor');
const reportService = require('../../src/services/reportService');
const { truncateAll, disconnect, getPrisma } = require('../helpers/db');

// Load real app config (weights, models)
const auditsConfig = yaml.load(fs.readFileSync(path.join(__dirname, '../../src/config/audits.yaml'), 'utf8'));
const modelsConfig = yaml.load(fs.readFileSync(path.join(__dirname, '../../src/config/models.yaml'), 'utf8'));
const APP_CONFIG = { audits: auditsConfig, models: modelsConfig };

// Canned gatherer data — matches the exact shapes each audit class expects
const CANNED_GATHERED_DATA = {
  ssr: {
    ssr_html_size: 2000,
    csr_html_size: 2000,
    ssr_text_length: 200,
    csr_text_length: 200,
    content_in_ssr_percent: 100,
    js_required: false,
    critical_elements_ssr: { h1: 1, h2: 2, articles: 0, paragraphs: 3, images: 0, links: 5, forms: 0, buttons: 0 },
    critical_elements_csr: { h1: 1, h2: 2, articles: 0, paragraphs: 3, images: 0, links: 5, forms: 0, buttons: 0 },
    critical_elements_ratio: 100,
    ssr_readiness_score: 80,
    framework_hints: []
  },
  structuredData: {
    jsonLd: [],
    microdata: [],
    rdfa: false,
    totalSchemas: 0,
    schemaTypes: [],
    schemaCount: 0,
    coverageScore: 40,
    quality: [],
    errors: [],
    hasOrganization: false,
    hasWebSite: false,
    hasBreadcrumb: false,
    detected_industry: 'general',
    industry_specific_gaps: { required: [], recommended: [], criticalGaps: false, priorityScore: 60 }
  },
  semanticHTML: {
    semanticElements: { header: 1, nav: 1, main: 1, article: 0, section: 0, aside: 0, footer: 1, figure: 0, figcaption: 0 },
    semanticRatio: 5,
    headings: { h1: [{ text: 'Test', position: 0 }], h2: 2, h3: 0, h4: 0, h5: 0, h6: 0 },
    headingHierarchy: { valid: true, gaps: [], totalHeadings: 3 },
    lists: { ul: 1, ol: 0, dl: 0 },
    aria: { roles: [], landmarks: 0, labels: 0, descriptions: 0 },
    links: { total: 5, withText: 5, external: 1, descriptive: 3 },
    images: { total: 0, withAlt: 0, withDescriptiveAlt: 0 },
    forms: { total: 0, withLabels: 0 },
    hasMainLandmark: true,
    hasNavigation: true,
    hasHeader: true,
    hasFooter: true
  },
  contentAnalysis: {
    wordCount: 100,
    characterCount: 600,
    paragraphs: { total: 4, avgLength: 80, tooShort: 1, tooLong: 0 },
    sentences: { total: 10, avgLength: 12 },
    contentDensity: 25,
    structure: { hasTableOfContents: false, hasSummary: false, hasTimestamps: false, hasAuthor: false, contentSections: 1 },
    codeBlocks: { total: 0, preFormatted: 0 },
    media: { images: 0, videos: 0, audio: 0 },
    readability: { hasHeadings: true, hasLists: true, hasBoldOrEmphasis: false, hasBlockquotes: false },
    extractabilityScore: 55
  }
};

// Mock runGatherers before each test — avoids launching real browsers
beforeAll(() => {
  jest.spyOn(Auditor.prototype, 'runGatherers').mockResolvedValue(CANNED_GATHERED_DATA);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('Audit Pipeline (Tier 2)', () => {
  beforeEach(truncateAll);
  afterAll(disconnect);

  it('runs full audit pipeline and produces valid scores', async () => {
    const auditor = new Auditor(APP_CONFIG);

    const phases = [];
    const result = await auditor.audit('https://test.example.com', {
      onPhase: (phase, msg) => phases.push({ phase, msg }),
      onStep: () => {},
      onLLMToken: () => {}
    });

    // Structural assertions
    expect(result.url).toBe('https://test.example.com');
    expect(result.scores).toBeDefined();
    expect(result.scores.overall).toBeGreaterThanOrEqual(0);
    expect(result.scores.overall).toBeLessThanOrEqual(100);

    // All 4 audits ran
    expect(result.auditResults).toBeDefined();
    expect(result.auditResults.ssrReadiness).toBeDefined();
    expect(result.auditResults.schemaCoverage).toBeDefined();
    expect(result.auditResults.semanticStructure).toBeDefined();
    expect(result.auditResults.contentExtractability).toBeDefined();

    // Each audit score in valid range
    for (const [name, audit] of Object.entries(result.auditResults)) {
      expect(audit.score).toBeGreaterThanOrEqual(0);
      expect(audit.score).toBeLessThanOrEqual(100);
    }

    // Metadata present
    expect(result.metadata).toBeDefined();
    expect(result.duration).toBeGreaterThan(0);

    // Phase callbacks were fired
    expect(phases.map(p => p.phase)).toContain(1);
    expect(phases.map(p => p.phase)).toContain(2);
    expect(phases.map(p => p.phase)).toContain(3);
    expect(phases.map(p => p.phase)).toContain(4);
  });

  it('saves audit result to DB via reportService', async () => {
    const auditor = new Auditor(APP_CONFIG);
    const result = await auditor.audit('https://save-test.example.com', {
      onPhase: () => {},
      onStep: () => {},
      onLLMToken: () => {}
    });

    const report = await reportService.createReport(result);
    expect(report).toBeDefined();
    expect(report.id).toBeDefined();
    expect(report.url).toBe('https://save-test.example.com');
    expect(report.overallScore).toBeGreaterThanOrEqual(0);

    // Verify DB persisted
    const prisma = getPrisma();
    const dbReport = await prisma.report.findUnique({ where: { id: report.id } });
    expect(dbReport).not.toBeNull();
    expect(dbReport.url).toBe('https://save-test.example.com');
  });

  it('weighted score calculation: all equal weights produce balanced score', async () => {
    const auditor = new Auditor(APP_CONFIG);
    const result = await auditor.audit('https://weight-test.example.com', {
      onPhase: () => {},
      onStep: () => {},
      onLLMToken: () => {}
    });

    const { scores, auditResults } = result;

    // Use weights from loaded config (snake_case keys match audits.yaml)
    const weights = auditsConfig.weights;
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const expected = Math.round(
      (auditResults.ssrReadiness.score * weights.ssr_readiness +
       auditResults.schemaCoverage.score * weights.schema_coverage +
       auditResults.semanticStructure.score * weights.semantic_structure +
       auditResults.contentExtractability.score * weights.content_extractability) / totalWeight
    );

    // Allow 1 point rounding tolerance
    expect(Math.abs(scores.overall - expected)).toBeLessThanOrEqual(1);
  });
});
