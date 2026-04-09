const SemanticStructureAudit = require('../../../src/audits/semantic-structure.audit');

// Base fixture derived from CANNED_DATA in tests/integration/audit-sse.test.js
const BASE_INPUT = {
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
};

function makeInput(overrides) {
  return {
    ...BASE_INPUT,
    ...overrides,
    semanticElements: { ...BASE_INPUT.semanticElements, ...(overrides.semanticElements || {}) },
    headingHierarchy: { ...BASE_INPUT.headingHierarchy, ...(overrides.headingHierarchy || {}) },
    aria: { ...BASE_INPUT.aria, ...(overrides.aria || {}) },
    links: { ...BASE_INPUT.links, ...(overrides.links || {}) },
    images: { ...BASE_INPUT.images, ...(overrides.images || {}) }
  };
}

// Perfect input: all landmarks, valid hierarchy, all descriptive links, no images, ARIA used
const PERFECT_INPUT = makeInput({
  semanticElements: { header: 1, nav: 1, main: 1, article: 2, section: 1, aside: 0, footer: 1, figure: 0, figcaption: 0 },
  headingHierarchy: { valid: true, gaps: [], totalHeadings: 5 },
  aria: { roles: ['main'], landmarks: 2, labels: 3, descriptions: 0 },
  links: { total: 10, withText: 10, external: 2, descriptive: 10 },
  images: { total: 0, withAlt: 0, withDescriptiveAlt: 0 },
  hasMainLandmark: true,
  hasNavigation: true,
  hasHeader: true,
  hasFooter: true
});

describe('SemanticStructureAudit', () => {
  let audit;

  beforeEach(() => {
    audit = new SemanticStructureAudit();
  });

  describe('meta', () => {
    it('returns expected meta fields', () => {
      const meta = SemanticStructureAudit.meta;
      expect(meta.id).toBe('semantic-structure');
      expect(meta.title).toBeDefined();
      expect(meta.weight).toBe(20);
      expect(meta.category).toBeDefined();
    });
  });

  describe('score calculation', () => {
    it('computes a high score with all landmarks, valid hierarchy, good links, no images', () => {
      const result = audit.audit(PERFECT_INPUT);
      // Expected: 10(main) + 5(nav) + 5(header) + 5(footer) + 5(article) + 15(valid hierarchy) + 10(headings>0) + 20(links 100%) + 15(no images) + 5(aria.landmarks) + 5(aria.labels) = 100
      expect(result.score).toBe(100);
    });

    it('score >= 90 → severity=pass', () => {
      const result = audit.audit(PERFECT_INPUT);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.severity).toBe('pass');
    });

    it('score >= 70 → severity=pass', () => {
      // Reduce score by removing some aria and article
      const input = makeInput({
        semanticElements: { ...BASE_INPUT.semanticElements, article: 0 },
        headingHierarchy: { valid: true, gaps: [], totalHeadings: 3 },
        aria: { roles: [], landmarks: 0, labels: 0, descriptions: 0 },
        links: { total: 5, withText: 5, external: 1, descriptive: 4 },
        images: { total: 0, withAlt: 0, withDescriptiveAlt: 0 }
      });
      const result = audit.audit(input);
      // 10+5+5+5+0 + 15+10 + 15(80% links) + 15(no images) + 0 + 0 = 80
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.severity).toBe('pass');
    });

    it('score < 50 → severity=critical', () => {
      const lowInput = makeInput({
        hasMainLandmark: false,
        hasNavigation: false,
        hasHeader: false,
        hasFooter: false,
        semanticElements: { header: 0, nav: 0, main: 0, article: 0, section: 0, aside: 0, footer: 0, figure: 0, figcaption: 0 },
        headingHierarchy: { valid: false, gaps: [2, 3, 4], totalHeadings: 0 },
        aria: { roles: [], landmarks: 0, labels: 0, descriptions: 0 },
        links: { total: 10, withText: 5, external: 1, descriptive: 1 },
        images: { total: 10, withAlt: 2, withDescriptiveAlt: 1 }
      });
      const result = audit.audit(lowInput);
      expect(result.score).toBeLessThan(50);
      expect(result.severity).toBe('critical');
    });

    it('score is capped at 100', () => {
      const result = audit.audit(PERFECT_INPUT);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('findings generation', () => {
    it('generates critical finding when hasMainLandmark=false', () => {
      const result = audit.audit(makeInput({ hasMainLandmark: false }));
      const critical = result.findings.find(f => f.type === 'critical');
      expect(critical).toBeDefined();
      expect(critical.title).toMatch(/main/i);
    });

    it('generates warning finding when headingHierarchy.valid=false', () => {
      const result = audit.audit(makeInput({
        headingHierarchy: { valid: false, gaps: [2, 3], totalHeadings: 2 }
      }));
      const warning = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('heading'));
      expect(warning).toBeDefined();
    });

    it('generates warning when descriptive link ratio < 0.6', () => {
      const result = audit.audit(makeInput({
        links: { total: 10, withText: 10, external: 1, descriptive: 3 }
      }));
      const warning = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('link'));
      expect(warning).toBeDefined();
    });

    it('generates warning when image alt ratio < 0.7', () => {
      const result = audit.audit(makeInput({
        images: { total: 10, withAlt: 3, withDescriptiveAlt: 2 }
      }));
      const warning = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('alt'));
      expect(warning).toBeDefined();
    });

    it('generates info finding when hasNavigation=false', () => {
      const result = audit.audit(makeInput({ hasNavigation: false }));
      const info = result.findings.find(f => f.type === 'info');
      expect(info).toBeDefined();
      expect(info.title).toMatch(/navigation/i);
    });

    it('generates pass finding when score >= 80', () => {
      const result = audit.audit(PERFECT_INPUT);
      const pass = result.findings.find(f => f.type === 'pass');
      expect(pass).toBeDefined();
    });

    it('each finding has type, title, and message properties', () => {
      const result = audit.audit(makeInput({
        hasMainLandmark: false,
        hasNavigation: false,
        headingHierarchy: { valid: false, gaps: [2], totalHeadings: 1 },
        links: { total: 10, withText: 6, external: 1, descriptive: 2 },
        images: { total: 5, withAlt: 1, withDescriptiveAlt: 1 }
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
      expect(result.id).toBe('semantic-structure');
      expect(result.weight).toBe(20);
    });

    it('includes details with landmark presence flags', () => {
      const result = audit.audit(BASE_INPUT);
      expect(result.details).toHaveProperty('has_landmarks');
      expect(result.details.has_landmarks).toHaveProperty('main');
      expect(result.details.has_landmarks).toHaveProperty('navigation');
    });

    it('includes heading_hierarchy_valid in details', () => {
      const result = audit.audit(BASE_INPUT);
      expect(result.details).toHaveProperty('heading_hierarchy_valid');
    });
  });
});
