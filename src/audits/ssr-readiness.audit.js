const logger = require('../utils/logger');

class SSRReadinessAudit {
  static get meta() {
    return {
      id: 'ssr-readiness',
      title: 'Server-Side Rendering Readiness',
      description: 'Evaluates whether critical content is available without JavaScript execution',
      weight: 25,
      category: 'AI Agent Compatibility',
      why_it_matters: 'Most AI crawlers (GPTBot, ClaudeBot, PerplexityBot) do NOT execute JavaScript. Content not in SSR is invisible to 80%+ of AI agents.'
    };
  }

  audit(gatheredData) {
    logger.info('Running SSR Readiness Audit...');

    const {
      content_in_ssr_percent,
      critical_elements_ratio,
      js_required,
      ssr_readiness_score,
      framework_hints
    } = gatheredData;

    // Determine score and severity
    let score = 0;
    let severity = 'critical';
    let displayValue = '';

    if (ssr_readiness_score >= 90) {
      score = 100;
      severity = 'pass';
      displayValue = 'Excellent - AI agents can fully access your content';
    } else if (ssr_readiness_score >= 70) {
      score = 75;
      severity = 'warning';
      displayValue = 'Good - Most content accessible, but improvements possible';
    } else if (ssr_readiness_score >= 50) {
      score = 50;
      severity = 'warning';
      displayValue = 'Needs Improvement - Significant content missing without JS';
    } else {
      score = 25;
      severity = 'critical';
      displayValue = 'Critical Issue - AI agents cannot access most content';
    }

    // Generate specific findings
    const findings = this.generateFindings(gatheredData);

    return {
      ...SSRReadinessAudit.meta,
      score,
      severity,
      displayValue,
      findings,
      details: {
        content_in_ssr_percent,
        critical_elements_ratio,
        js_required,
        overall_score: ssr_readiness_score,
        framework_detected: framework_hints.length > 0 ? framework_hints : null
      }
    };
  }

  generateFindings(data) {
    const findings = [];

    // Critical: Low SSR content
    if (data.content_in_ssr_percent < 70) {
      findings.push({
        type: 'critical',
        title: 'Most content requires JavaScript',
        message: `Only ${data.content_in_ssr_percent}% of text content is available in server-rendered HTML. AI crawlers like GPTBot and ClaudeBot cannot see the remaining ${100 - data.content_in_ssr_percent}% of your content.`,
        recommendation: 'Implement server-side rendering (SSR) or static site generation (SSG). Consider frameworks like Next.js, Nuxt, or Astro.',
        impact: 'high',
        effort: 'high'
      });
    }

    // Warning: Missing critical elements
    if (data.critical_elements_ratio < 80) {
      findings.push({
        type: 'warning',
        title: 'Critical HTML elements missing in initial page load',
        message: `Only ${Math.round(data.critical_elements_ratio)}% of critical elements (headings, articles, links) are present in the server-rendered HTML.`,
        recommendation: 'Ensure headings, articles, and key navigation render server-side before client-side hydration.',
        impact: 'medium',
        effort: 'medium'
      });
    }

    // Info: JS required
    if (data.js_required) {
      findings.push({
        type: 'info',
        title: 'Page requires JavaScript for full functionality',
        message: 'Significant content and functionality requires JavaScript execution.',
        recommendation: 'Consider progressive enhancement: provide core content server-side, enhance with JavaScript.',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Positive: Good SSR
    if (data.ssr_readiness_score >= 90 && data.framework_hints.length > 0) {
      findings.push({
        type: 'pass',
        title: 'Excellent SSR implementation',
        message: `Detected ${data.framework_hints.join(', ')}. Your content is fully accessible to AI agents.`,
        recommendation: 'Maintain current SSR approach. Monitor for regressions.',
        impact: 'n/a',
        effort: 'n/a'
      });
    }

    return findings;
  }
}

module.exports = SSRReadinessAudit;
