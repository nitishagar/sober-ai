const ContentExtractabilityAudit = require('../../../src/audits/content-extractability.audit');

// Base fixture derived from CANNED_DATA in tests/integration/audit-sse.test.js
const BASE_INPUT = {
  wordCount: 100,
  characterCount: 600,
  paragraphs: { total: 4, avgLength: 80, tooShort: 1, tooLong: 0 },
  sentences: { total: 10, avgLength: 12 },
  contentDensity: 25,
  structure: {
    hasTableOfContents: false,
    hasSummary: false,
    hasTimestamps: false,
    hasAuthor: false,
    contentSections: 1
  },
  codeBlocks: { total: 0, preFormatted: 0 },
  media: { images: 0, videos: 0, audio: 0 },
  readability: { hasHeadings: true, hasLists: true, hasBoldOrEmphasis: false, hasBlockquotes: false },
  extractabilityScore: 55
};

function makeInput(overrides) {
  return {
    ...BASE_INPUT,
    ...overrides,
    paragraphs: { ...BASE_INPUT.paragraphs, ...(overrides.paragraphs || {}) },
    sentences: { ...BASE_INPUT.sentences, ...(overrides.sentences || {}) },
    structure: { ...BASE_INPUT.structure, ...(overrides.structure || {}) }
  };
}

describe('ContentExtractabilityAudit', () => {
  let audit;

  beforeEach(() => {
    audit = new ContentExtractabilityAudit();
  });

  describe('meta', () => {
    it('returns expected meta fields', () => {
      const meta = ContentExtractabilityAudit.meta;
      expect(meta.id).toBe('content-extractability');
      expect(meta.title).toBeDefined();
      expect(meta.weight).toBe(20);
      expect(meta.category).toBeDefined();
    });
  });

  describe('score and severity', () => {
    it('score=95 → severity=pass, displayValue contains Excellent', () => {
      const result = audit.audit(makeInput({ extractabilityScore: 95 }));
      expect(result.score).toBe(95);
      expect(result.severity).toBe('pass');
      expect(result.displayValue).toMatch(/excellent/i);
    });

    it('score=75 → severity=pass, displayValue contains Good', () => {
      const result = audit.audit(makeInput({ extractabilityScore: 75 }));
      expect(result.score).toBe(75);
      expect(result.severity).toBe('pass');
      expect(result.displayValue).toMatch(/good/i);
    });

    it('score=55 → severity=warning, displayValue contains Fair', () => {
      const result = audit.audit(makeInput({ extractabilityScore: 55 }));
      expect(result.score).toBe(55);
      expect(result.severity).toBe('warning');
      expect(result.displayValue).toMatch(/fair/i);
    });

    it('score=30 → severity=critical, displayValue contains Critical', () => {
      const result = audit.audit(makeInput({ extractabilityScore: 30 }));
      expect(result.score).toBe(30);
      expect(result.severity).toBe('critical');
      expect(result.displayValue).toMatch(/critical/i);
    });

    it('score at boundary 70 → severity=pass', () => {
      const result = audit.audit(makeInput({ extractabilityScore: 70 }));
      expect(result.severity).toBe('pass');
    });

    it('score at boundary 50 → severity=warning', () => {
      const result = audit.audit(makeInput({ extractabilityScore: 50 }));
      expect(result.severity).toBe('warning');
    });
  });

  describe('findings generation', () => {
    it('generates critical finding when contentDensity < 10', () => {
      const result = audit.audit(makeInput({ contentDensity: 5, extractabilityScore: 30 }));
      const critical = result.findings.find(f => f.type === 'critical');
      expect(critical).toBeDefined();
      expect(critical.title).toMatch(/low content/i);
    });

    it('generates warning finding when contentDensity > 60', () => {
      const result = audit.audit(makeInput({ contentDensity: 75, extractabilityScore: 55 }));
      const warning = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('high content'));
      expect(warning).toBeDefined();
    });

    it('generates warning when paragraphs.total < 3 and wordCount > 300', () => {
      const result = audit.audit(makeInput({
        paragraphs: { total: 2, avgLength: 200, tooShort: 0, tooLong: 0 },
        wordCount: 400,
        extractabilityScore: 40
      }));
      const warning = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('paragraph'));
      expect(warning).toBeDefined();
    });

    it('generates info finding when > 40% paragraphs are too short', () => {
      const result = audit.audit(makeInput({
        paragraphs: { total: 10, avgLength: 30, tooShort: 5, tooLong: 0 },
        extractabilityScore: 50
      }));
      const info = result.findings.find(f => f.type === 'info' && f.title.toLowerCase().includes('short'));
      expect(info).toBeDefined();
    });

    it('generates warning when sentences.avgLength > 30', () => {
      const result = audit.audit(makeInput({
        sentences: { total: 10, avgLength: 35 },
        extractabilityScore: 50
      }));
      const warning = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('sentence'));
      expect(warning).toBeDefined();
    });

    it('generates warning when no structure (no TOC, no summary, contentSections <= 2)', () => {
      const result = audit.audit(makeInput({
        structure: { hasTableOfContents: false, hasSummary: false, hasTimestamps: false, hasAuthor: false, contentSections: 1 },
        extractabilityScore: 45
      }));
      const warning = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('structure'));
      expect(warning).toBeDefined();
    });

    it('generates info finding when no author and no timestamps', () => {
      const result = audit.audit(makeInput({
        structure: { hasTableOfContents: false, hasSummary: false, hasTimestamps: false, hasAuthor: false, contentSections: 3 },
        extractabilityScore: 60
      }));
      const info = result.findings.find(f => f.type === 'info' && f.title.toLowerCase().includes('author'));
      expect(info).toBeDefined();
    });

    it('generates pass finding when extractabilityScore >= 80', () => {
      const result = audit.audit(makeInput({
        extractabilityScore: 85,
        contentDensity: 25
      }));
      const pass = result.findings.find(f => f.type === 'pass');
      expect(pass).toBeDefined();
    });

    it('each finding has type, title, and message properties', () => {
      const result = audit.audit(makeInput({
        contentDensity: 5,
        paragraphs: { total: 1, avgLength: 400, tooShort: 0, tooLong: 1 },
        sentences: { total: 20, avgLength: 35 },
        wordCount: 400,
        extractabilityScore: 20,
        structure: { hasTableOfContents: false, hasSummary: false, hasTimestamps: false, hasAuthor: false, contentSections: 1 }
      }));
      for (const finding of result.findings) {
        expect(finding).toHaveProperty('type');
        expect(finding).toHaveProperty('title');
        expect(finding).toHaveProperty('message');
      }
    });
  });

  describe('return shape', () => {
    it('includes meta fields in result', () => {
      const result = audit.audit(BASE_INPUT);
      expect(result.id).toBe('content-extractability');
      expect(result.weight).toBe(20);
    });

    it('includes details with word_count and content_density', () => {
      const result = audit.audit(makeInput({ wordCount: 500, contentDensity: 30 }));
      expect(result.details.word_count).toBe(500);
      expect(result.details.content_density).toBe(30);
    });

    it('includes paragraph_count in details', () => {
      const result = audit.audit(makeInput({ paragraphs: { total: 6, avgLength: 80, tooShort: 1, tooLong: 0 } }));
      expect(result.details.paragraph_count).toBe(6);
    });
  });
});
