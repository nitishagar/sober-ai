const axios = require('axios');
const logger = require('../utils/logger');

const AI_CRAWLERS = ['GPTBot', 'ChatGPT-User', 'anthropic-ai', 'CCBot', 'Google-Extended'];

class MachineReadabilityGatherer {
  async gather(url, page) {
    logger.info(`Machine Readability: Analyzing ${url}`);

    const baseUrl = this._baseUrl(url);

    const [robotsResult, llmsTxtResult, sitemapResult, responseTimeResult, metaResult] = await Promise.all([
      this._fetchRobotsTxt(baseUrl),
      this._fetchLlmsTxt(baseUrl),
      this._fetchSitemap(baseUrl),
      this._measureResponseTime(url),
      this._extractMetaTags(page)
    ]);

    const ogComplete = !!(
      metaResult.og_title &&
      metaResult.og_description &&
      metaResult.og_image
    );

    return {
      // robots.txt
      robots_txt_exists: robotsResult.exists,
      robots_txt_blocks_ai: robotsResult.blocksAi,
      robots_txt_allows_ai: robotsResult.allowsAi,
      robots_ai_crawlers: robotsResult.crawlerStatus,

      // llms.txt
      llms_txt_exists: llmsTxtResult.exists,

      // sitemap
      sitemap_exists: sitemapResult.exists,
      sitemap_parseable: sitemapResult.parseable,

      // OpenGraph
      og_title: metaResult.og_title,
      og_description: metaResult.og_description,
      og_image: metaResult.og_image,
      twitter_card: metaResult.twitter_card,
      twitter_title: metaResult.twitter_title,
      og_complete: ogComplete,

      // Performance
      response_time_ms: responseTimeResult.responseTimeMs,
      is_https: url.startsWith('https://')
    };
  }

  _baseUrl(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return url;
    }
  }

  async _fetchRobotsTxt(baseUrl) {
    try {
      const response = await axios.get(`${baseUrl}/robots.txt`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200) {
        return { exists: false, blocksAi: false, allowsAi: true, crawlerStatus: {} };
      }

      const text = response.data || '';
      return this._parseRobotsTxt(text);
    } catch {
      return { exists: false, blocksAi: false, allowsAi: true, crawlerStatus: {} };
    }
  }

  _parseRobotsTxt(text) {
    const lines = text.split('\n').map(l => l.trim());
    const crawlerStatus = {};

    // Parse per-agent rules
    let currentAgents = [];
    for (const line of lines) {
      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.split(':').slice(1).join(':').trim();
        currentAgents = [agent];
      } else if (line.toLowerCase().startsWith('disallow:')) {
        const path = line.split(':').slice(1).join(':').trim();
        for (const agent of currentAgents) {
          if (!crawlerStatus[agent]) crawlerStatus[agent] = { disallow: [], allow: [] };
          if (path) crawlerStatus[agent].disallow.push(path);
        }
      } else if (line.toLowerCase().startsWith('allow:')) {
        const path = line.split(':').slice(1).join(':').trim();
        for (const agent of currentAgents) {
          if (!crawlerStatus[agent]) crawlerStatus[agent] = { disallow: [], allow: [] };
          if (path) crawlerStatus[agent].allow.push(path);
        }
      } else if (line === '') {
        currentAgents = [];
      }
    }

    // Determine per-AI-crawler status
    const result = {};
    let blockedCount = 0;
    let allowedCount = 0;

    for (const crawler of AI_CRAWLERS) {
      const agentRules = crawlerStatus[crawler] || crawlerStatus['*'];
      let isBlocked = false;

      if (agentRules) {
        // Blocked if disallow: / with no overriding allow
        const disallowsRoot = agentRules.disallow.includes('/');
        const hasAllowAll = agentRules.allow.includes('/');
        isBlocked = disallowsRoot && !hasAllowAll;
      }

      result[crawler] = !isBlocked;
      if (isBlocked) blockedCount++;
      else allowedCount++;
    }

    const blocksAi = blockedCount === AI_CRAWLERS.length;
    const allowsAi = blockedCount === 0;

    return { exists: true, blocksAi, allowsAi, crawlerStatus: result };
  }

  async _fetchLlmsTxt(baseUrl) {
    try {
      const response = await axios.get(`${baseUrl}/llms.txt`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });
      return { exists: response.status === 200 };
    } catch {
      return { exists: false };
    }
  }

  async _fetchSitemap(baseUrl) {
    try {
      const response = await axios.get(`${baseUrl}/sitemap.xml`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      if (response.status !== 200) {
        return { exists: false, parseable: false };
      }

      const xml = response.data || '';
      const hasUrlElements = xml.includes('<url>') || xml.includes('<url ');
      return { exists: true, parseable: hasUrlElements };
    } catch {
      return { exists: false, parseable: false };
    }
  }

  async _measureResponseTime(url) {
    const start = Date.now();
    try {
      await axios.get(url, {
        timeout: 10000,
        validateStatus: () => true,
        maxRedirects: 3
      });
      return { responseTimeMs: Date.now() - start };
    } catch {
      return { responseTimeMs: Date.now() - start };
    }
  }

  async _extractMetaTags(page) {
    if (!page) {
      return {
        og_title: null,
        og_description: null,
        og_image: null,
        twitter_card: null,
        twitter_title: null
      };
    }

    return await page.evaluate(() => {
      const getMeta = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.getAttribute('content') || null : null;
      };

      return {
        og_title: getMeta('meta[property="og:title"]'),
        og_description: getMeta('meta[property="og:description"]'),
        og_image: getMeta('meta[property="og:image"]'),
        twitter_card: getMeta('meta[name="twitter:card"]'),
        twitter_title: getMeta('meta[name="twitter:title"]')
      };
    });
  }
}

module.exports = MachineReadabilityGatherer;
