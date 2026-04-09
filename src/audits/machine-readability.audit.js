const logger = require('../utils/logger');

class MachineReadabilityAudit {
  static get meta() {
    return {
      id: 'machine-readability',
      title: 'Machine Readability',
      description: 'Evaluates how discoverable and accessible the website is to AI crawlers and automated agents',
      weight: 20,
      category: 'AI Agent Compatibility',
      why_it_matters: 'AI crawlers need explicit permission (robots.txt), structured discovery files (llms.txt, sitemap.xml), rich metadata (OpenGraph), and fast response times to effectively index and represent your content.'
    };
  }

  audit(gatheredData) {
    logger.info('Running Machine Readability Audit...');

    const score = this._calculateScore(gatheredData);
    const severity = this._getSeverity(score);
    const displayValue = this._getDisplayValue(score);
    const findings = this._generateFindings(gatheredData);

    return {
      ...MachineReadabilityAudit.meta,
      score,
      severity,
      displayValue,
      findings,
      details: {
        robots_txt_exists: gatheredData.robots_txt_exists,
        robots_txt_allows_ai: gatheredData.robots_txt_allows_ai,
        robots_txt_blocks_ai: gatheredData.robots_txt_blocks_ai,
        robots_ai_crawlers: gatheredData.robots_ai_crawlers,
        llms_txt_exists: gatheredData.llms_txt_exists,
        sitemap_exists: gatheredData.sitemap_exists,
        sitemap_parseable: gatheredData.sitemap_parseable,
        og_complete: gatheredData.og_complete,
        og_title: gatheredData.og_title,
        og_description: gatheredData.og_description,
        og_image: gatheredData.og_image,
        twitter_card: gatheredData.twitter_card,
        response_time_ms: gatheredData.response_time_ms,
        is_https: gatheredData.is_https
      }
    };
  }

  _calculateScore(data) {
    let score = 0;

    // robots.txt AI crawler access (30 pts)
    if (data.robots_txt_exists) {
      if (data.robots_txt_allows_ai) {
        score += 30;
      } else if (!data.robots_txt_blocks_ai) {
        // Mixed — some crawlers blocked, some allowed
        score += 15;
      }
      // 0 pts if blocks all AI crawlers
    } else {
      // No robots.txt = implicitly allows all crawlers
      score += 30;
    }

    // llms.txt present (20 pts)
    if (data.llms_txt_exists) {
      score += 20;
    }

    // sitemap.xml present + parseable (20 pts)
    if (data.sitemap_exists && data.sitemap_parseable) {
      score += 20;
    } else if (data.sitemap_exists) {
      score += 10;
    }

    // OpenGraph meta present (15 pts)
    if (data.og_complete) {
      score += 15;
    } else if (data.og_title || data.og_description) {
      score += 8;
    }

    // HTTP response time < 3s (15 pts)
    if (data.response_time_ms < 3000) {
      score += 15;
    } else if (data.response_time_ms < 6000) {
      score += 7;
    }

    return Math.min(100, score);
  }

  _getSeverity(score) {
    if (score >= 90) return 'pass';
    if (score >= 75) return 'warning';
    if (score >= 50) return 'warning';
    return 'critical';
  }

  _getDisplayValue(score) {
    if (score >= 90) return 'Excellent - Highly discoverable by AI crawlers';
    if (score >= 75) return 'Good - Mostly accessible to AI systems';
    if (score >= 50) return 'Needs Improvement - Several discoverability gaps found';
    return 'Critical - AI crawlers cannot effectively discover this site';
  }

  _generateFindings(data) {
    const findings = [];

    // robots.txt findings
    if (!data.robots_txt_exists) {
      findings.push({
        type: 'warning',
        title: 'No robots.txt file found',
        message: 'Without a robots.txt, AI crawlers have no explicit guidance. While they can still crawl, explicit permissions help build trust and ensure correct behavior.',
        recommendation: 'Create a /robots.txt that explicitly allows AI crawlers: GPTBot, ChatGPT-User, anthropic-ai, CCBot, Google-Extended.'
      });
    } else if (data.robots_txt_blocks_ai) {
      findings.push({
        type: 'critical',
        title: 'robots.txt blocks all AI crawlers',
        message: 'Your robots.txt explicitly blocks all known AI crawlers (GPTBot, ChatGPT-User, anthropic-ai, CCBot, Google-Extended). This prevents AI systems from indexing your content.',
        recommendation: 'Review your robots.txt and remove Disallow: / rules for AI crawlers you want to allow. Consider allowing GPTBot and anthropic-ai at minimum.'
      });
    } else if (!data.robots_txt_allows_ai) {
      findings.push({
        type: 'warning',
        title: 'Some AI crawlers are blocked in robots.txt',
        message: 'Your robots.txt blocks some but not all AI crawlers, creating inconsistent AI discoverability.',
        recommendation: 'Review which AI crawlers are blocked and add explicit Allow rules for crawlers you want to permit.'
      });
    } else {
      findings.push({
        type: 'pass',
        title: 'AI crawlers allowed in robots.txt',
        message: 'Your robots.txt permits AI crawlers to access your content.',
        recommendation: 'Maintain these permissions. Consider adding explicit Allow entries for new AI crawlers as they emerge.'
      });
    }

    // llms.txt findings
    if (!data.llms_txt_exists) {
      findings.push({
        type: 'warning',
        title: 'No llms.txt file found',
        message: 'llms.txt is an emerging standard that gives AI systems structured instructions about your content. Absence means AI agents lack context about how to interpret your site.',
        recommendation: 'Create a /llms.txt file following the emerging spec at llmstxt.org. Include your site purpose, key pages, and content guidance for LLMs.'
      });
    } else {
      findings.push({
        type: 'pass',
        title: 'llms.txt present',
        message: 'Your site provides structured AI instructions via llms.txt.',
        recommendation: 'Keep llms.txt up to date as your content evolves.'
      });
    }

    // sitemap findings
    if (!data.sitemap_exists) {
      findings.push({
        type: 'critical',
        title: 'No sitemap.xml found',
        message: 'Without a sitemap, AI crawlers must rely solely on link discovery to find your pages. Many pages may never be indexed.',
        recommendation: 'Generate a sitemap.xml using your CMS or a tool like sitemap-generator-cli. Submit it to Google Search Console and include the URL in robots.txt.'
      });
    } else if (!data.sitemap_parseable) {
      findings.push({
        type: 'warning',
        title: 'sitemap.xml exists but appears malformed',
        message: 'A sitemap.xml was found but does not contain parseable <url> elements. AI crawlers may not be able to use it effectively.',
        recommendation: 'Validate your sitemap at https://www.xml-sitemaps.com/validate-xml-sitemap.html and ensure it contains <url><loc>...</loc></url> entries.'
      });
    } else {
      findings.push({
        type: 'pass',
        title: 'Valid sitemap.xml found',
        message: 'Your site has a parseable sitemap.xml, helping AI crawlers discover all your pages.',
        recommendation: 'Keep your sitemap updated and include it in your robots.txt with: Sitemap: https://yourdomain.com/sitemap.xml'
      });
    }

    // OpenGraph findings
    if (!data.og_title && !data.og_description) {
      findings.push({
        type: 'warning',
        title: 'Missing OpenGraph meta tags',
        message: 'No og:title or og:description tags found. AI systems use these tags to understand page context and generate accurate previews.',
        recommendation: 'Add OpenGraph meta tags: <meta property="og:title" content="...">, <meta property="og:description" content="...">, <meta property="og:image" content="...">.'
      });
    } else if (!data.og_complete) {
      findings.push({
        type: 'warning',
        title: 'Incomplete OpenGraph meta tags',
        message: `Some OpenGraph tags are missing. Present: ${[data.og_title && 'og:title', data.og_description && 'og:description', data.og_image && 'og:image'].filter(Boolean).join(', ')}.`,
        recommendation: `Add the missing OpenGraph tags: ${[!data.og_title && 'og:title', !data.og_description && 'og:description', !data.og_image && 'og:image'].filter(Boolean).join(', ')}.`
      });
    } else {
      findings.push({
        type: 'pass',
        title: 'Complete OpenGraph meta tags',
        message: 'All core OpenGraph tags (og:title, og:description, og:image) are present.',
        recommendation: 'Consider adding og:type and og:url for even richer AI context.'
      });
    }

    // Response time findings
    if (data.response_time_ms >= 6000) {
      findings.push({
        type: 'critical',
        title: 'Very slow HTTP response time',
        message: `Response time of ${data.response_time_ms}ms is critically slow. AI crawlers may time out and fail to index your content.`,
        recommendation: 'Investigate server performance, enable caching (CDN, Redis), and optimize your database queries. Target < 3s response time.'
      });
    } else if (data.response_time_ms >= 3000) {
      findings.push({
        type: 'warning',
        title: 'Slow HTTP response time',
        message: `Response time of ${data.response_time_ms}ms exceeds the 3s threshold. This may cause AI crawlers to de-prioritize or skip your site.`,
        recommendation: 'Enable server-side caching, use a CDN, and optimize your largest content elements.'
      });
    } else {
      findings.push({
        type: 'pass',
        title: 'Fast HTTP response time',
        message: `Response time of ${data.response_time_ms}ms is within the acceptable range (< 3s).`,
        recommendation: 'Continue monitoring response times. Consider setting up alerts if response time exceeds 2s.'
      });
    }

    return findings;
  }
}

module.exports = MachineReadabilityAudit;
