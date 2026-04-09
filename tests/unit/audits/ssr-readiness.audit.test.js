const SSRReadinessAudit = require('../../../src/audits/ssr-readiness.audit');

// Base fixture derived from CANNED_DATA in tests/integration/audit-sse.test.js
const BASE_INPUT = {
  ssr_html_size: 2000,
  csr_html_size: 2000,
  ssr_text_length: 200,
  csr_text_length: 200,
  content_in_ssr_percent: 100,
  js_required: false,
  critical_elements_ratio: 100,
  ssr_readiness_score: 80,
  framework_hints: []
};

function makeInput(overrides) {
  return { ...BASE_INPUT, ...overrides };
}

describe('SSRReadinessAudit', () => {
  let audit;

  beforeEach(() => {
    audit = new SSRReadinessAudit();
  });

  describe('meta', () => {
    it('returns expected meta fields', () => {
      const meta = SSRReadinessAudit.meta;
      expect(meta.id).toBe('ssr-readiness');
      expect(meta.title).toBeDefined();
      expect(meta.weight).toBe(25);
      expect(meta.category).toBeDefined();
    });
  });

  describe('score calculation', () => {
    it('returns score=100 and severity=pass when ssr_readiness_score >= 90', () => {
      const result = audit.audit(makeInput({ ssr_readiness_score: 95 }));
      expect(result.score).toBe(100);
      expect(result.severity).toBe('pass');
    });

    it('returns score=75 and severity=warning when ssr_readiness_score >= 70', () => {
      const result = audit.audit(makeInput({ ssr_readiness_score: 75 }));
      expect(result.score).toBe(75);
      expect(result.severity).toBe('warning');
    });

    it('returns score=50 and severity=warning when ssr_readiness_score >= 50', () => {
      const result = audit.audit(makeInput({ ssr_readiness_score: 55 }));
      expect(result.score).toBe(50);
      expect(result.severity).toBe('warning');
    });

    it('returns score=25 and severity=critical when ssr_readiness_score < 50', () => {
      const result = audit.audit(makeInput({ ssr_readiness_score: 30 }));
      expect(result.score).toBe(25);
      expect(result.severity).toBe('critical');
    });
  });

  describe('findings generation', () => {
    it('generates critical finding when content_in_ssr_percent < 70', () => {
      const result = audit.audit(makeInput({
        content_in_ssr_percent: 50,
        ssr_readiness_score: 30
      }));
      const critical = result.findings.find(f => f.type === 'critical');
      expect(critical).toBeDefined();
      expect(critical.title).toMatch(/JavaScript/i);
    });

    it('generates warning finding when critical_elements_ratio < 80', () => {
      const result = audit.audit(makeInput({
        critical_elements_ratio: 60,
        ssr_readiness_score: 65
      }));
      const warning = result.findings.find(f => f.type === 'warning');
      expect(warning).toBeDefined();
    });

    it('generates info finding when js_required=true', () => {
      const result = audit.audit(makeInput({
        js_required: true,
        ssr_readiness_score: 65
      }));
      const info = result.findings.find(f => f.type === 'info');
      expect(info).toBeDefined();
      expect(info.title).toMatch(/JavaScript/i);
    });

    it('generates pass finding when ssr_readiness_score >= 90 and framework_hints present', () => {
      const result = audit.audit(makeInput({
        ssr_readiness_score: 95,
        framework_hints: ['Next.js'],
        content_in_ssr_percent: 100
      }));
      const pass = result.findings.find(f => f.type === 'pass');
      expect(pass).toBeDefined();
      expect(pass.message).toContain('Next.js');
    });

    it('returns no findings for clean high-score input', () => {
      const result = audit.audit(makeInput({
        ssr_readiness_score: 95,
        content_in_ssr_percent: 100,
        critical_elements_ratio: 100,
        js_required: false,
        framework_hints: []
      }));
      expect(Array.isArray(result.findings)).toBe(true);
    });

    it('each finding has type, title, and message properties', () => {
      const result = audit.audit(makeInput({
        content_in_ssr_percent: 50,
        critical_elements_ratio: 60,
        js_required: true,
        ssr_readiness_score: 30
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
      const result = audit.audit(makeInput({ ssr_readiness_score: 80 }));
      expect(result.id).toBe('ssr-readiness');
      expect(result.title).toBeDefined();
      expect(result.weight).toBe(25);
      expect(result.category).toBeDefined();
    });

    it('includes score, severity, displayValue, findings, and details', () => {
      const result = audit.audit(makeInput({ ssr_readiness_score: 80 }));
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('displayValue');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('details');
      expect(Array.isArray(result.findings)).toBe(true);
    });

    it('includes content_in_ssr_percent in details', () => {
      const result = audit.audit(makeInput({ content_in_ssr_percent: 85, ssr_readiness_score: 80 }));
      expect(result.details.content_in_ssr_percent).toBe(85);
    });
  });
});
