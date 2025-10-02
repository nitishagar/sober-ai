const Scorer = require('../../src/core/scorer');

describe('Scorer', () => {
  describe('Weight validation', () => {
    it('should normalize weights that do not sum to 100', () => {
      const weights = {
        ssr_readiness: 20,
        schema_coverage: 20,
        semantic_structure: 20,
        content_extractability: 20
      };

      const scorer = new Scorer(weights);

      // Weights should be normalized to sum to 100
      const total = Object.values(scorer.weights).reduce((a, b) => a + b, 0);
      expect(Math.abs(total - 100)).toBeLessThan(0.01);
    });

    it('should accept weights that sum to 100', () => {
      const weights = {
        ssr_readiness: 25,
        schema_coverage: 20,
        semantic_structure: 20,
        content_extractability: 20,
        machine_readability: 10,
        performance: 5
      };

      const scorer = new Scorer(weights);
      expect(scorer.weights).toEqual(weights);
    });
  });

  describe('Score calculation', () => {
    it('should calculate weighted scores correctly', () => {
      const weights = {
        ssr_readiness: 25,
        schema_coverage: 25,
        semantic_structure: 25,
        content_extractability: 25
      };

      const scorer = new Scorer(weights);

      const auditResults = {
        ssrReadiness: { score: 100, severity: 'pass' },
        schemaCoverage: { score: 80, severity: 'pass' },
        semanticStructure: { score: 90, severity: 'pass' },
        contentExtractability: { score: 70, severity: 'warning' }
      };

      const result = scorer.calculate(auditResults);

      // Expected: (100*25 + 80*25 + 90*25 + 70*25) / 100 = 85
      expect(result.overall).toBe(85);
      expect(result.grade).toBe('B');
    });

    it('should handle zero scores', () => {
      const weights = {
        ssr_readiness: 50,
        schema_coverage: 50
      };

      const scorer = new Scorer(weights);

      const auditResults = {
        ssrReadiness: { score: 0, severity: 'critical' },
        schemaCoverage: { score: 0, severity: 'critical' }
      };

      const result = scorer.calculate(auditResults);

      expect(result.overall).toBe(0);
      expect(result.grade).toBe('F');
    });
  });

  describe('Grade assignment', () => {
    const weights = { test: 100 };
    const scorer = new Scorer(weights);

    it('should assign grade A for scores >= 90', () => {
      expect(scorer.getGrade(95)).toBe('A');
      expect(scorer.getGrade(90)).toBe('A');
    });

    it('should assign grade B for scores 80-89', () => {
      expect(scorer.getGrade(85)).toBe('B');
      expect(scorer.getGrade(80)).toBe('B');
    });

    it('should assign grade C for scores 70-79', () => {
      expect(scorer.getGrade(75)).toBe('C');
      expect(scorer.getGrade(70)).toBe('C');
    });

    it('should assign grade D for scores 60-69', () => {
      expect(scorer.getGrade(65)).toBe('D');
      expect(scorer.getGrade(60)).toBe('D');
    });

    it('should assign grade F for scores < 60', () => {
      expect(scorer.getGrade(50)).toBe('F');
      expect(scorer.getGrade(0)).toBe('F');
    });
  });
});
