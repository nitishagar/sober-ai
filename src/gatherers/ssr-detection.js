const logger = require('../utils/logger');

class SSRDetectionGatherer {
  async gather(url, browser) {
    logger.info(`SSR Detection: Analyzing ${url}`);

    // Step 1: Fetch WITHOUT JavaScript
    logger.info('Step 1: Fetching without JS...');
    const contextNoJS = await browser.newContext({
      javaScriptEnabled: false,
      userAgent: 'SoberAI-Optimizer/1.0 (No-JS Mode)'
    });

    try {
      const pageNoJS = await contextNoJS.newPage();
      await pageNoJS.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const ssrHTML = await pageNoJS.content();
      const ssrText = await this.extractTextContent(pageNoJS);
      const ssrElements = await this.extractCriticalElements(pageNoJS);

      await contextNoJS.close();

      // Step 2: Fetch WITH JavaScript
      logger.info('Step 2: Fetching with JS...');
      const contextWithJS = await browser.newContext({
        javaScriptEnabled: true,
        userAgent: 'SoberAI-Optimizer/1.0 (JS Mode)'
      });

      try {
        const pageWithJS = await contextWithJS.newPage();
        await pageWithJS.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for dynamic content
        await pageWithJS.waitForTimeout(3000);

        const csrHTML = await pageWithJS.content();
        const csrText = await this.extractTextContent(pageWithJS);
        const csrElements = await this.extractCriticalElements(pageWithJS);

        // Step 3: Calculate metrics
        return this.calculateMetrics(
          { html: ssrHTML, text: ssrText, elements: ssrElements },
          { html: csrHTML, text: csrText, elements: csrElements }
        );
      } finally {
        await contextWithJS.close();
      }
    } catch (err) {
      await contextNoJS.close().catch(() => {});
      throw err;
    }
  }

  async extractTextContent(page) {
    return await page.evaluate(() => {
      // Simplified text extraction without TreeWalker filter callback
      // which causes issues in Playwright context
      function extractVisibleText(element) {
        let text = '';

        for (const node of element.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            const trimmed = node.textContent.trim();
            if (trimmed) {
              text += trimmed + ' ';
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();

            // Skip script, style, and noscript tags
            if (['script', 'style', 'noscript'].includes(tagName)) {
              continue;
            }

            // Check if element is visible
            const style = window.getComputedStyle(node);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              text += extractVisibleText(node);
            }
          }
        }

        return text;
      }

      return extractVisibleText(document.body).trim();
    });
  }

  async extractCriticalElements(page) {
    return await page.evaluate(() => {
      return {
        h1: document.querySelectorAll('h1').length,
        h2: document.querySelectorAll('h2').length,
        articles: document.querySelectorAll('article, [role="article"]').length,
        paragraphs: document.querySelectorAll('p').length,
        images: document.querySelectorAll('img[alt]').length,
        links: document.querySelectorAll('a[href]').length,
        forms: document.querySelectorAll('form').length,
        buttons: document.querySelectorAll('button, [role="button"]').length
      };
    });
  }

  calculateMetrics(ssr, csr) {
    const ssrTextLength = ssr.text.length;
    const csrTextLength = csr.text.length;

    // Calculate content availability percentage
    const contentInSSR = csrTextLength > 0
      ? Math.min(100, (ssrTextLength / csrTextLength) * 100)
      : (ssrTextLength > 0 ? 100 : 0);

    // Calculate critical elements ratio
    const criticalElementsRatio = this.calculateElementRatio(
      ssr.elements,
      csr.elements
    );

    // Overall SSR readiness score
    const ssrReadinessScore = Math.round(contentInSSR * 0.7 + criticalElementsRatio * 0.3);

    // Determine if JS is required
    const jsRequired = csrTextLength > ssrTextLength * 1.5 ||
                       this.significantElementIncrease(ssr.elements, csr.elements);

    return {
      ssr_html_size: ssr.html.length,
      csr_html_size: csr.html.length,
      ssr_text_length: ssrTextLength,
      csr_text_length: csrTextLength,
      content_in_ssr_percent: Math.round(contentInSSR),
      js_required: jsRequired,
      critical_elements_ssr: ssr.elements,
      critical_elements_csr: csr.elements,
      critical_elements_ratio: Math.round(criticalElementsRatio),
      ssr_readiness_score: ssrReadinessScore,
      framework_hints: this.detectFramework(csr.html)
    };
  }

  calculateElementRatio(ssrElements, csrElements) {
    let totalRatio = 0;
    let count = 0;

    for (const [key, csrValue] of Object.entries(csrElements)) {
      if (csrValue > 0) {
        const ssrValue = ssrElements[key] || 0;
        totalRatio += (ssrValue / csrValue);
        count++;
      }
    }

    return count > 0 ? (totalRatio / count) * 100 : 0;
  }

  significantElementIncrease(ssrElements, csrElements) {
    // Check if key elements significantly increased with JS
    const keyElements = ['articles', 'paragraphs', 'links'];

    for (const elem of keyElements) {
      const ssrCount = ssrElements[elem] || 0;
      const csrCount = csrElements[elem] || 0;

      if (csrCount > ssrCount * 2 && csrCount - ssrCount > 5) {
        return true;
      }
    }

    return false;
  }

  detectFramework(html) {
    const hints = [];

    if (html.includes('__NEXT_DATA__')) hints.push('Next.js');
    if (html.includes('__nuxt')) hints.push('Nuxt.js');
    if (html.includes('ng-version')) hints.push('Angular');
    if (html.includes('data-reactroot') || html.includes('data-reactid')) hints.push('React');
    if (html.includes('data-v-')) hints.push('Vue.js');
    if (html.includes('data-svelte')) hints.push('Svelte');
    if (html.includes('data-astro')) hints.push('Astro');

    return hints;
  }
}

module.exports = SSRDetectionGatherer;
