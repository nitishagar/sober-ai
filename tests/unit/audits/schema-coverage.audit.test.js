const SchemaCoverageAudit = require('../../../src/audits/schema-coverage.audit');

// Base fixture derived from CANNED_DATA in tests/integration/audit-sse.test.js
const BASE_INPUT = {
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
  industry_specific_gaps: {
    required: [],
    recommended: [],
    criticalGaps: false,
    priorityScore: 60
  }
};

function makeInput(overrides) {
  return {
    ...BASE_INPUT,
    ...overrides,
    industry_specific_gaps: {
      ...BASE_INPUT.industry_specific_gaps,
      ...(overrides.industry_specific_gaps || {})
    }
  };
}

describe('SchemaCoverageAudit', () => {
  let audit;

  beforeEach(() => {
    audit = new SchemaCoverageAudit();
  });

  describe('meta', () => {
    it('returns expected meta fields', () => {
      const meta = SchemaCoverageAudit.meta;
      expect(meta.id).toBe('schema-coverage');
      expect(meta.title).toBeDefined();
      expect(meta.weight).toBe(20);
      expect(meta.category).toBeDefined();
    });
  });

  describe('score calculation', () => {
    it('returns score=100 and severity=pass when coverageScore >= 90', () => {
      const result = audit.audit(makeInput({ coverageScore: 95, schemaCount: 3, schemaTypes: ['Organization'] }));
      expect(result.score).toBe(100);
      expect(result.severity).toBe('pass');
    });

    it('returns score=75 and severity=pass when coverageScore >= 70', () => {
      const result = audit.audit(makeInput({ coverageScore: 75, schemaCount: 2, schemaTypes: ['Organization', 'WebSite'] }));
      expect(result.score).toBe(75);
      expect(result.severity).toBe('pass');
    });

    it('returns score=50 and severity=warning when coverageScore >= 40', () => {
      const result = audit.audit(makeInput({ coverageScore: 50, schemaCount: 1, schemaTypes: ['Organization'] }));
      expect(result.score).toBe(50);
      expect(result.severity).toBe('warning');
    });

    it('returns score=25 and severity=warning when coverageScore > 0 but < 40', () => {
      const result = audit.audit(makeInput({ coverageScore: 20, schemaCount: 1, schemaTypes: ['Organization'] }));
      expect(result.score).toBe(25);
      expect(result.severity).toBe('warning');
    });

    it('returns score=0 and severity=critical when coverageScore === 0', () => {
      const result = audit.audit(makeInput({ coverageScore: 0, schemaCount: 0 }));
      expect(result.score).toBe(0);
      expect(result.severity).toBe('critical');
    });
  });

  describe('findings generation', () => {
    it('generates critical finding when schemaCount === 0', () => {
      const result = audit.audit(makeInput({
        schemaCount: 0,
        coverageScore: 0,
        detected_industry: 'ecommerce',
        industry_specific_gaps: {
          required: ['Product', 'Offer'],
          recommended: [],
          criticalGaps: false,
          priorityScore: 0
        }
      }));
      const critical = result.findings.find(f => f.type === 'critical' && f.title.toLowerCase().includes('no schema'));
      expect(critical).toBeDefined();
    });

    it('generates critical finding when industry_specific_gaps.criticalGaps=true', () => {
      const result = audit.audit(makeInput({
        schemaCount: 1,
        coverageScore: 20,
        schemaTypes: ['Organization'],
        industry_specific_gaps: {
          required: ['Product', 'Offer'],
          recommended: [],
          criticalGaps: true,
          priorityScore: 10
        }
      }));
      const criticals = result.findings.filter(f => f.type === 'critical');
      expect(criticals.length).toBeGreaterThan(0);
    });

    it('generates warning finding when recommended schemas are missing and schemaCount > 0', () => {
      const result = audit.audit(makeInput({
        schemaCount: 2,
        coverageScore: 50,
        schemaTypes: ['Organization', 'WebSite'],
        industry_specific_gaps: {
          required: [],
          recommended: ['BreadcrumbList', 'FAQPage', 'HowTo'],
          criticalGaps: false,
          priorityScore: 40
        }
      }));
      const warning = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('enhancement'));
      expect(warning).toBeDefined();
    });

    it('generates warning finding when errors are present', () => {
      const result = audit.audit(makeInput({
        schemaCount: 1,
        coverageScore: 30,
        schemaTypes: ['Organization'],
        errors: ['Invalid JSON-LD syntax']
      }));
      const warning = result.findings.find(f => f.type === 'warning' && f.title.toLowerCase().includes('validation'));
      expect(warning).toBeDefined();
    });

    it('generates pass finding when coverageScore >= 70', () => {
      const result = audit.audit(makeInput({
        schemaCount: 3,
        coverageScore: 75,
        schemaTypes: ['Organization', 'WebSite', 'BreadcrumbList']
      }));
      const pass = result.findings.find(f => f.type === 'pass');
      expect(pass).toBeDefined();
    });

    it('each finding has type, title, and message properties', () => {
      const result = audit.audit(makeInput({
        schemaCount: 0,
        coverageScore: 0,
        errors: ['Bad JSON'],
        industry_specific_gaps: {
          required: ['Product'],
          recommended: ['FAQPage'],
          criticalGaps: true,
          priorityScore: 0
        }
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
      const result = audit.audit(makeInput({ coverageScore: 50 }));
      expect(result.id).toBe('schema-coverage');
      expect(result.weight).toBe(20);
    });

    it('includes details with schema_count and coverage_score', () => {
      const result = audit.audit(makeInput({ schemaCount: 2, coverageScore: 55 }));
      expect(result.details.schema_count).toBe(2);
      expect(result.details.coverage_score).toBe(55);
    });

    it('reports has_errors=true when errors array is non-empty', () => {
      const result = audit.audit(makeInput({ errors: ['error1', 'error2'] }));
      expect(result.details.has_errors).toBe(true);
      expect(result.details.error_count).toBe(2);
    });
  });
});
