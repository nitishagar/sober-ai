const logger = require('../utils/logger');

class SchemaCoverageAudit {
  static get meta() {
    return {
      id: 'schema-coverage',
      title: 'Schema.org Structured Data Coverage',
      description: 'Evaluates presence and quality of Schema.org markup',
      weight: 20,
      category: 'AI Agent Compatibility',
      why_it_matters: 'Schema.org markup is confirmed to be used by Google Gemini, Microsoft Copilot, and OpenAI for understanding website content.'
    };
  }

  audit(gatheredData) {
    logger.info('Running Schema Coverage Audit...');

    const {
      schemaCount,
      coverageScore,
      schemaTypes,
      detected_industry,
      industry_specific_gaps,
      errors
    } = gatheredData;

    // Determine score and severity
    let score = 0;
    let severity = 'critical';
    let displayValue = '';

    if (coverageScore >= 90) {
      score = 100;
      severity = 'pass';
      displayValue = 'Excellent - Comprehensive structured data implementation';
    } else if (coverageScore >= 70) {
      score = 75;
      severity = 'pass';
      displayValue = 'Good - Strong schema coverage with room for enhancement';
    } else if (coverageScore >= 40) {
      score = 50;
      severity = 'warning';
      displayValue = 'Fair - Basic schemas present, missing key types';
    } else if (coverageScore > 0) {
      score = 25;
      severity = 'warning';
      displayValue = 'Needs Improvement - Minimal structured data';
    } else {
      score = 0;
      severity = 'critical';
      displayValue = 'Critical - No structured data found';
    }

    // Generate findings
    const findings = this.generateFindings(gatheredData);

    return {
      ...SchemaCoverageAudit.meta,
      score,
      severity,
      displayValue,
      findings,
      details: {
        schema_count: schemaCount,
        schema_types: schemaTypes,
        coverage_score: coverageScore,
        detected_industry,
        missing_required: industry_specific_gaps.required,
        missing_recommended: industry_specific_gaps.recommended,
        has_errors: errors.length > 0,
        error_count: errors.length
      }
    };
  }

  generateFindings(data) {
    const findings = [];

    // No schemas found
    if (data.schemaCount === 0) {
      findings.push({
        type: 'critical',
        title: 'No Schema.org markup found',
        message: 'Your website has no structured data. AI agents cannot understand your content structure, entity relationships, or key information.',
        recommendation: `Add Schema.org JSON-LD for your industry (${data.detected_industry}). Start with Organization and ${data.industry_specific_gaps.required.slice(0, 2).join(', ')} schemas.`,
        impact: 'high',
        effort: 'medium'
      });
    }

    // Missing critical industry schemas
    if (data.industry_specific_gaps.criticalGaps) {
      findings.push({
        type: 'critical',
        title: `Missing required schemas for ${data.detected_industry} websites`,
        message: `Critical schemas missing: ${data.industry_specific_gaps.required.join(', ')}`,
        recommendation: `Implement these required schemas for ${data.detected_industry} industry. These are essential for AI agents to understand your business type and offerings.`,
        impact: 'high',
        effort: 'medium'
      });
    }

    // Missing recommended schemas
    if (data.industry_specific_gaps.recommended.length > 0 && data.schemaCount > 0) {
      findings.push({
        type: 'warning',
        title: 'Enhancement opportunities',
        message: `Consider adding: ${data.industry_specific_gaps.recommended.slice(0, 3).join(', ')}`,
        recommendation: 'These schemas will enhance AI visibility and rich results eligibility.',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Errors in schemas
    if (data.errors.length > 0) {
      findings.push({
        type: 'warning',
        title: 'Schema validation errors',
        message: `Found ${data.errors.length} invalid schema(s). AI agents may ignore malformed structured data.`,
        recommendation: 'Fix JSON-LD syntax errors. Use Google Rich Results Test to validate.',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Good coverage
    if (data.coverageScore >= 70) {
      findings.push({
        type: 'pass',
        title: 'Strong structured data implementation',
        message: `Found ${data.schemaCount} schemas including: ${data.schemaTypes.slice(0, 5).join(', ')}`,
        recommendation: 'Maintain current schema implementation. Consider adding missing recommended types for further enhancement.',
        impact: 'n/a',
        effort: 'n/a'
      });
    }

    return findings;
  }
}

module.exports = SchemaCoverageAudit;
