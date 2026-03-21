const request = require('supertest');
const { makeTestServer } = require('../helpers/server');
const { collectSSE } = require('../helpers/sse');
const { truncateAll, disconnect } = require('../helpers/db');
const app = require('../../src/api/server');

// Canned gatherer data — avoids launching real browsers
const CANNED_DATA = {
  ssr: {
    ssr_html_size: 2000, csr_html_size: 2000,
    ssr_text_length: 200, csr_text_length: 200,
    content_in_ssr_percent: 100, js_required: false,
    critical_elements_ssr: { h1: 1, h2: 2, articles: 0, paragraphs: 3, images: 0, links: 5, forms: 0, buttons: 0 },
    critical_elements_csr: { h1: 1, h2: 2, articles: 0, paragraphs: 3, images: 0, links: 5, forms: 0, buttons: 0 },
    critical_elements_ratio: 100, ssr_readiness_score: 80, framework_hints: []
  },
  structuredData: {
    jsonLd: [], microdata: [], rdfa: false, totalSchemas: 0,
    schemaTypes: [], schemaCount: 0, coverageScore: 40, quality: [], errors: [],
    hasOrganization: false, hasWebSite: false, hasBreadcrumb: false,
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
    hasMainLandmark: true, hasNavigation: true, hasHeader: true, hasFooter: true
  },
  contentAnalysis: {
    wordCount: 100, characterCount: 600,
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

// Mock runGatherers before loading Auditor module
const Auditor = require('../../src/core/auditor');
jest.spyOn(Auditor.prototype, 'runGatherers').mockResolvedValue(CANNED_DATA);

const testServer = makeTestServer(app);

describe('POST /api/audit-progress (SSE)', () => {
  beforeAll(() => testServer.start());
  afterAll(async () => {
    await testServer.stop();
    await disconnect();
  });
  beforeEach(truncateAll);

  it('returns 400 when url is missing', async () => {
    const res = await request(app).post('/api/audit-progress').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/i);
  });

  it('streams started → processing → completed events', async () => {
    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://example.com' },
      { maxEvents: 20, timeoutMs: 30000 }
    );

    expect(events.length).toBeGreaterThan(0);

    const firstEvent = events[0];
    expect(firstEvent.status).toBe('started');
    expect(firstEvent.sessionId).toBeDefined();

    const completedEvent = events.find(e => e.status === 'completed');
    expect(completedEvent).toBeDefined();
    expect(completedEvent.reportId).toBeDefined();
    expect(typeof completedEvent.reportId).toBe('string');
  });

  it('saves report to DB after successful audit', async () => {
    const { getPrisma } = require('../helpers/db');

    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://test-audit.example.com' },
      { maxEvents: 20, timeoutMs: 30000 }
    );

    const completedEvent = events.find(e => e.status === 'completed');
    expect(completedEvent).toBeDefined();

    const prisma = getPrisma();
    const report = await prisma.report.findUnique({ where: { id: completedEvent.reportId } });
    expect(report).not.toBeNull();
    expect(report.url).toBe('https://test-audit.example.com');
  });

  it('emits progress events with increasing progress values', async () => {
    const events = await collectSSE(
      `${testServer.url()}/api/audit-progress`,
      { url: 'https://progress-test.example.com' },
      { maxEvents: 20, timeoutMs: 30000 }
    );

    const progressEvents = events.filter(e => e.status === 'processing');
    expect(progressEvents.length).toBeGreaterThan(0);

    // Progress values should be non-decreasing
    for (let i = 1; i < progressEvents.length; i++) {
      expect(progressEvents[i].progress).toBeGreaterThanOrEqual(progressEvents[i - 1].progress);
    }
  });
});
