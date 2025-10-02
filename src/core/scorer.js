const logger = require('../utils/logger');

class Scorer {
  constructor(weights) {
    this.weights = weights;
    this.validateWeights();
  }

  validateWeights() {
    const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(total - 100) > 0.01) {
      logger.warn(`Weights sum to ${total}, not 100. Normalizing...`);
      // Normalize weights
      const factor = 100 / total;
      for (const key in this.weights) {
        this.weights[key] *= factor;
      }
    }
  }

  calculate(auditResults) {
    let totalScore = 0;
    const categoryScores = {};

    for (const [auditName, result] of Object.entries(auditResults)) {
      const weightKey = this.getWeightKey(auditName);
      const weight = this.weights[weightKey] || 0;
      const score = result.score || 0;

      const weightedScore = (score * weight) / 100;
      totalScore += weightedScore;

      categoryScores[auditName] = {
        score,
        weight,
        weightedScore: Math.round(weightedScore),
        severity: result.severity
      };
    }

    return {
      overall: Math.round(totalScore),
      grade: this.getGrade(totalScore),
      categories: categoryScores,
      timestamp: new Date().toISOString()
    };
  }

  getWeightKey(auditName) {
    const keyMap = {
      ssrReadiness: 'ssr_readiness',
      schemaCoverage: 'schema_coverage',
      semanticStructure: 'semantic_structure',
      contentExtractability: 'content_extractability'
    };
    return keyMap[auditName] || auditName;
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

module.exports = Scorer;
