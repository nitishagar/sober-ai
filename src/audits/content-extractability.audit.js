const logger = require('../utils/logger');

class ContentExtractabilityAudit {
  static get meta() {
    return {
      id: 'content-extractability',
      title: 'Content Extractability',
      description: 'Evaluates how easily AI systems can extract and understand content',
      weight: 20,
      category: 'AI Agent Compatibility',
      why_it_matters: 'Well-structured, extractable content allows AI agents to accurately summarize, cite, and understand your information.'
    };
  }

  audit(gatheredData) {
    logger.info('Running Content Extractability Audit...');

    const {
      extractabilityScore,
      contentDensity,
      wordCount,
      paragraphs,
      sentences,
      structure,
      readability
    } = gatheredData;

    // Use the pre-calculated extractability score
    const score = extractabilityScore;

    // Determine severity
    let severity = 'critical';
    let displayValue = '';

    if (score >= 90) {
      severity = 'pass';
      displayValue = 'Excellent - Highly extractable content';
    } else if (score >= 70) {
      severity = 'pass';
      displayValue = 'Good - Well-structured content';
    } else if (score >= 50) {
      severity = 'warning';
      displayValue = 'Fair - Content could be better structured';
    } else {
      severity = 'critical';
      displayValue = 'Critical - Difficult to extract content';
    }

    // Generate findings
    const findings = this.generateFindings(gatheredData);

    return {
      ...ContentExtractabilityAudit.meta,
      score,
      severity,
      displayValue,
      findings,
      details: {
        word_count: wordCount,
        content_density: contentDensity,
        paragraph_count: paragraphs.total,
        avg_paragraph_length: Math.round(paragraphs.avgLength),
        avg_sentence_length: Math.round(sentences.avgLength),
        has_structure: structure.hasTableOfContents || structure.contentSections > 2,
        has_metadata: structure.hasAuthor || structure.hasTimestamps
      }
    };
  }

  generateFindings(data) {
    const findings = [];

    // Low content density (too much markup)
    if (data.contentDensity < 10) {
      findings.push({
        type: 'critical',
        title: 'Very low content-to-markup ratio',
        message: `Content density is ${data.contentDensity.toFixed(1)}%. Page has excessive HTML markup relative to actual text content.`,
        recommendation: 'Reduce unnecessary div wrappers and simplify HTML structure. Aim for 15-40% content density.',
        impact: 'high',
        effort: 'high'
      });
    } else if (data.contentDensity > 60) {
      findings.push({
        type: 'warning',
        title: 'Very high content-to-markup ratio',
        message: `Content density is ${data.contentDensity.toFixed(1)}%. May lack semantic structure and formatting.`,
        recommendation: 'Add semantic HTML structure (headings, sections, lists) to improve content organization.',
        impact: 'medium',
        effort: 'medium'
      });
    }

    // Too few paragraphs
    if (data.paragraphs.total < 3 && data.wordCount > 300) {
      findings.push({
        type: 'warning',
        title: 'Insufficient paragraph structure',
        message: `Only ${data.paragraphs.total} paragraphs for ${data.wordCount} words. Large blocks of text are hard for AI to parse.`,
        recommendation: 'Break content into smaller, focused paragraphs (3-5 sentences each).',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Paragraph length issues
    if (data.paragraphs.tooShort > data.paragraphs.total * 0.4) {
      findings.push({
        type: 'info',
        title: 'Many very short paragraphs',
        message: `${Math.round((data.paragraphs.tooShort / data.paragraphs.total) * 100)}% of paragraphs are very short (<20 words). Can fragment content understanding.`,
        recommendation: 'Combine related short paragraphs into more substantial ones.',
        impact: 'low',
        effort: 'low'
      });
    }

    if (data.paragraphs.tooLong > data.paragraphs.total * 0.3) {
      findings.push({
        type: 'warning',
        title: 'Many very long paragraphs',
        message: `${Math.round((data.paragraphs.tooLong / data.paragraphs.total) * 100)}% of paragraphs are very long (>300 words). Difficult for AI to extract key points.`,
        recommendation: 'Break long paragraphs into smaller ones, each focused on a single idea.',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Sentence complexity
    if (data.sentences.avgLength > 30) {
      findings.push({
        type: 'warning',
        title: 'Complex sentences',
        message: `Average sentence length is ${Math.round(data.sentences.avgLength)} words. Very long sentences can confuse AI parsing.`,
        recommendation: 'Break complex sentences into simpler ones. Aim for 15-25 words per sentence.',
        impact: 'medium',
        effort: 'medium'
      });
    }

    // Missing structure
    if (!data.structure.hasTableOfContents && !data.structure.hasSummary && data.structure.contentSections <= 2) {
      findings.push({
        type: 'warning',
        title: 'Lack of content structure',
        message: 'Content lacks clear organization (no table of contents, summary, or multiple sections).',
        recommendation: 'Add section headings, a table of contents, or an introductory summary to help AI understand content structure.',
        impact: 'medium',
        effort: 'medium'
      });
    }

    // Missing metadata
    if (!data.structure.hasAuthor && !data.structure.hasTimestamps) {
      findings.push({
        type: 'info',
        title: 'Missing author and date information',
        message: 'No author or publication date detected. AI agents use this for source credibility and content freshness.',
        recommendation: 'Add author bylines and publication/update dates to your content.',
        impact: 'low',
        effort: 'low'
      });
    }

    // Good extractability
    if (data.extractabilityScore >= 80) {
      findings.push({
        type: 'pass',
        title: 'Excellent content structure',
        message: 'Content is well-structured with appropriate density, paragraph organization, and metadata. Easy for AI agents to extract and understand.',
        recommendation: 'Maintain current content structure practices.',
        impact: 'n/a',
        effort: 'n/a'
      });
    }

    return findings;
  }
}

module.exports = ContentExtractabilityAudit;
