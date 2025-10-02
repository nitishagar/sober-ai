const logger = require('../utils/logger');

class SemanticHTMLGatherer {
  async gather(url, page) {
    logger.info(`Semantic HTML: Analyzing ${url}`);

    return await page.evaluate(() => {
      // Count semantic elements
      const semanticElements = {
        header: document.querySelectorAll('header').length,
        nav: document.querySelectorAll('nav').length,
        main: document.querySelectorAll('main').length,
        article: document.querySelectorAll('article').length,
        section: document.querySelectorAll('section').length,
        aside: document.querySelectorAll('aside').length,
        footer: document.querySelectorAll('footer').length,
        figure: document.querySelectorAll('figure').length,
        figcaption: document.querySelectorAll('figcaption').length
      };

      // Count headings and analyze hierarchy
      const headings = {
        h1: Array.from(document.querySelectorAll('h1')).map(h => ({
          text: h.textContent.trim().substring(0, 100),
          position: Array.from(document.body.querySelectorAll('*')).indexOf(h)
        })),
        h2: document.querySelectorAll('h2').length,
        h3: document.querySelectorAll('h3').length,
        h4: document.querySelectorAll('h4').length,
        h5: document.querySelectorAll('h5').length,
        h6: document.querySelectorAll('h6').length
      };

      // Check heading hierarchy
      const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const headingLevels = allHeadings.map(h => parseInt(h.tagName.substring(1)));

      let hierarchyValid = true;
      let hierarchyGaps = [];
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1];
        if (diff > 1) {
          hierarchyValid = false;
          hierarchyGaps.push({
            from: headingLevels[i - 1],
            to: headingLevels[i],
            position: i
          });
        }
      }

      // Count lists
      const lists = {
        ul: document.querySelectorAll('ul').length,
        ol: document.querySelectorAll('ol').length,
        dl: document.querySelectorAll('dl').length
      };

      // Check for ARIA roles and landmarks
      const aria = {
        roles: Array.from(document.querySelectorAll('[role]')).map(el =>
          el.getAttribute('role')
        ).filter((v, i, a) => a.indexOf(v) === i),
        landmarks: document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]').length,
        labels: document.querySelectorAll('[aria-label], [aria-labelledby]').length,
        descriptions: document.querySelectorAll('[aria-describedby]').length
      };

      // Check links
      const links = {
        total: document.querySelectorAll('a[href]').length,
        withText: Array.from(document.querySelectorAll('a[href]')).filter(a =>
          a.textContent.trim().length > 0
        ).length,
        external: Array.from(document.querySelectorAll('a[href]')).filter(a => {
          try {
            const url = new URL(a.href);
            return url.hostname !== window.location.hostname;
          } catch {
            return false;
          }
        }).length,
        descriptive: Array.from(document.querySelectorAll('a[href]')).filter(a => {
          const text = a.textContent.trim().toLowerCase();
          return text.length > 15 && !['click here', 'read more', 'learn more', 'here'].includes(text);
        }).length
      };

      // Check images
      const images = {
        total: document.querySelectorAll('img').length,
        withAlt: document.querySelectorAll('img[alt]').length,
        withDescriptiveAlt: Array.from(document.querySelectorAll('img[alt]')).filter(img =>
          img.alt.trim().length > 5
        ).length
      };

      // Check forms
      const forms = {
        total: document.querySelectorAll('form').length,
        withLabels: Array.from(document.querySelectorAll('form')).filter(form => {
          const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
          const labels = form.querySelectorAll('label');
          return labels.length >= inputs.length * 0.8; // At least 80% have labels
        }).length
      };

      // Calculate semantic score
      const totalElements = document.querySelectorAll('*').length;
      const semanticElementCount = Object.values(semanticElements).reduce((a, b) => a + b, 0);
      const semanticRatio = totalElements > 0 ? (semanticElementCount / totalElements) * 100 : 0;

      return {
        semanticElements,
        semanticRatio: Math.round(semanticRatio * 100) / 100,
        headings,
        headingHierarchy: {
          valid: hierarchyValid,
          gaps: hierarchyGaps,
          totalHeadings: allHeadings.length
        },
        lists,
        aria,
        links,
        images,
        forms,
        hasMainLandmark: document.querySelector('main, [role="main"]') !== null,
        hasNavigation: document.querySelector('nav, [role="navigation"]') !== null,
        hasHeader: document.querySelector('header, [role="banner"]') !== null,
        hasFooter: document.querySelector('footer, [role="contentinfo"]') !== null
      };
    });
  }
}

module.exports = SemanticHTMLGatherer;
