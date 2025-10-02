const logger = require('../utils/logger');

class SemanticStructureAudit {
  static get meta() {
    return {
      id: 'semantic-structure',
      title: 'Semantic HTML Structure',
      description: 'Evaluates use of semantic HTML5 elements and document structure',
      weight: 20,
      category: 'AI Agent Compatibility',
      why_it_matters: 'Semantic HTML helps AI agents understand content hierarchy, relationships, and meaning without complex parsing.'
    };
  }

  audit(gatheredData) {
    logger.info('Running Semantic Structure Audit...');

    const {
      semanticElements,
      semanticRatio,
      headingHierarchy,
      hasMainLandmark,
      hasNavigation,
      hasHeader,
      hasFooter,
      links,
      images,
      aria
    } = gatheredData;

    // Calculate score
    let score = 0;

    // Semantic elements presence (30 points)
    if (hasMainLandmark) score += 10;
    if (hasNavigation) score += 5;
    if (hasHeader) score += 5;
    if (hasFooter) score += 5;
    if (semanticElements.article > 0) score += 5;

    // Heading hierarchy (25 points)
    if (headingHierarchy.valid) {
      score += 15;
    } else if (headingHierarchy.gaps.length <= 2) {
      score += 10;
    } else {
      score += 5;
    }
    if (headingHierarchy.totalHeadings > 0) score += 10;

    // Link quality (20 points)
    if (links.total > 0) {
      const descriptiveRatio = links.descriptive / links.total;
      if (descriptiveRatio >= 0.8) score += 20;
      else if (descriptiveRatio >= 0.6) score += 15;
      else if (descriptiveRatio >= 0.4) score += 10;
      else score += 5;
    }

    // Image accessibility (15 points)
    if (images.total > 0) {
      const altRatio = images.withDescriptiveAlt / images.total;
      if (altRatio >= 0.9) score += 15;
      else if (altRatio >= 0.7) score += 10;
      else if (altRatio >= 0.5) score += 5;
    } else {
      score += 15; // No images is fine
    }

    // ARIA usage (10 points)
    if (aria.landmarks > 0) score += 5;
    if (aria.labels > 0) score += 5;

    score = Math.min(100, score);

    // Determine severity
    let severity = 'critical';
    let displayValue = '';

    if (score >= 90) {
      severity = 'pass';
      displayValue = 'Excellent - Strong semantic structure';
    } else if (score >= 70) {
      severity = 'pass';
      displayValue = 'Good - Solid semantic HTML usage';
    } else if (score >= 50) {
      severity = 'warning';
      displayValue = 'Fair - Basic semantic structure present';
    } else {
      severity = 'critical';
      displayValue = 'Critical - Poor semantic structure';
    }

    // Generate findings
    const findings = this.generateFindings(gatheredData, score);

    return {
      ...SemanticStructureAudit.meta,
      score,
      severity,
      displayValue,
      findings,
      details: {
        semantic_ratio: semanticRatio,
        has_landmarks: {
          main: hasMainLandmark,
          navigation: hasNavigation,
          header: hasHeader,
          footer: hasFooter
        },
        heading_hierarchy_valid: headingHierarchy.valid,
        total_headings: headingHierarchy.totalHeadings,
        link_quality: links.total > 0 ? Math.round((links.descriptive / links.total) * 100) : 0,
        image_accessibility: images.total > 0 ? Math.round((images.withDescriptiveAlt / images.total) * 100) : 100
      }
    };
  }

  generateFindings(data, score) {
    const findings = [];

    // Missing main landmark
    if (!data.hasMainLandmark) {
      findings.push({
        type: 'critical',
        title: 'Missing main content landmark',
        message: 'No <main> element or role="main" found. AI agents cannot identify primary content area.',
        recommendation: 'Add a <main> element wrapping your primary content, or add role="main" to your content container.',
        impact: 'high',
        effort: 'low'
      });
    }

    // Invalid heading hierarchy
    if (!data.headingHierarchy.valid) {
      findings.push({
        type: 'warning',
        title: 'Broken heading hierarchy',
        message: `Found ${data.headingHierarchy.gaps.length} gap(s) in heading levels. Skipping heading levels confuses AI content parsers.`,
        recommendation: 'Use headings sequentially (h1 → h2 → h3) without skipping levels. Every page should have exactly one h1.',
        impact: 'medium',
        effort: 'medium'
      });
    }

    // Poor link quality
    if (data.links.total > 0) {
      const descriptiveRatio = data.links.descriptive / data.links.total;
      if (descriptiveRatio < 0.6) {
        findings.push({
          type: 'warning',
          title: 'Non-descriptive link text',
          message: `${Math.round((1 - descriptiveRatio) * 100)}% of links use generic text like "click here" or "read more". AI agents rely on link context for understanding relationships.`,
          recommendation: 'Use descriptive link text that makes sense out of context. Example: "Read our privacy policy" instead of "click here".',
          impact: 'medium',
          effort: 'medium'
        });
      }
    }

    // Poor image accessibility
    if (data.images.total > 0) {
      const altRatio = data.images.withDescriptiveAlt / data.images.total;
      if (altRatio < 0.7) {
        findings.push({
          type: 'warning',
          title: 'Missing or poor image alt text',
          message: `${Math.round((1 - altRatio) * 100)}% of images lack descriptive alt attributes. AI agents cannot understand visual content without text descriptions.`,
          recommendation: 'Add descriptive alt text to all images. Describe what the image shows and its purpose in context.',
          impact: 'medium',
          effort: 'low'
        });
      }
    }

    // Missing navigation
    if (!data.hasNavigation) {
      findings.push({
        type: 'info',
        title: 'No navigation landmark',
        message: 'No <nav> element found. AI agents may have difficulty identifying site navigation.',
        recommendation: 'Wrap your main navigation in a <nav> element.',
        impact: 'low',
        effort: 'low'
      });
    }

    // Good semantic structure
    if (score >= 80) {
      findings.push({
        type: 'pass',
        title: 'Strong semantic HTML structure',
        message: 'Your page uses semantic HTML effectively with proper landmarks, heading hierarchy, and accessible elements.',
        recommendation: 'Maintain current semantic structure practices.',
        impact: 'n/a',
        effort: 'n/a'
      });
    }

    return findings;
  }
}

module.exports = SemanticStructureAudit;
