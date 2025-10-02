const logger = require('../utils/logger');

class ContentAnalysisGatherer {
  async gather(url, page) {
    logger.info(`Content Analysis: Analyzing ${url}`);

    return await page.evaluate(() => {
      // Extract main content
      const mainContent = document.querySelector('main, [role="main"], article') || document.body;

      // Get all text content
      const allText = mainContent.textContent;
      const words = allText.trim().split(/\s+/).filter(w => w.length > 0);

      // Count paragraphs and their characteristics
      const paragraphs = Array.from(mainContent.querySelectorAll('p'));
      const paragraphStats = {
        total: paragraphs.length,
        avgLength: paragraphs.length > 0
          ? paragraphs.reduce((sum, p) => sum + p.textContent.length, 0) / paragraphs.length
          : 0,
        tooShort: paragraphs.filter(p => p.textContent.trim().split(/\s+/).length < 20).length,
        tooLong: paragraphs.filter(p => p.textContent.trim().split(/\s+/).length > 300).length
      };

      // Analyze sentences
      const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const sentenceStats = {
        total: sentences.length,
        avgLength: sentences.length > 0
          ? sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length
          : 0
      };

      // Check for structured content patterns
      const hasTableOfContents = document.querySelector('[id*="toc"], [class*="table-of-contents"]') !== null;
      const hasSummary = document.querySelector('summary, [class*="summary"]') !== null;
      const hasTimestamps = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(allText);

      // Check for author information
      const hasAuthor = document.querySelector('[rel="author"], [class*="author"], [itemtype*="Person"]') !== null;

      // Analyze content structure
      const contentSections = mainContent.querySelectorAll('section, article, [class*="section"]').length;

      // Calculate content density (text vs markup ratio)
      const htmlLength = mainContent.innerHTML.length;
      const textLength = allText.length;
      const contentDensity = htmlLength > 0 ? (textLength / htmlLength) * 100 : 0;

      // Check for code blocks (technical content)
      const codeBlocks = {
        total: mainContent.querySelectorAll('pre, code, [class*="code"]').length,
        preFormatted: mainContent.querySelectorAll('pre').length
      };

      // Check for media
      const media = {
        images: mainContent.querySelectorAll('img').length,
        videos: mainContent.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length,
        audio: mainContent.querySelectorAll('audio').length
      };

      // Check readability indicators
      const readability = {
        hasHeadings: mainContent.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
        hasLists: mainContent.querySelectorAll('ul, ol').length > 0,
        hasBoldOrEmphasis: mainContent.querySelectorAll('strong, b, em, i').length > 0,
        hasBlockquotes: mainContent.querySelectorAll('blockquote').length > 0
      };

      // Calculate extractability score
      let extractabilityScore = 0;

      // Good content density (20 points)
      if (contentDensity >= 15 && contentDensity <= 40) extractabilityScore += 20;
      else if (contentDensity >= 10) extractabilityScore += 10;

      // Proper paragraph structure (20 points)
      if (paragraphStats.total > 3) {
        extractabilityScore += 10;
        if (paragraphStats.tooShort < paragraphStats.total * 0.3) extractabilityScore += 5;
        if (paragraphStats.tooLong < paragraphStats.total * 0.2) extractabilityScore += 5;
      }

      // Sentence structure (15 points)
      if (sentenceStats.avgLength >= 10 && sentenceStats.avgLength <= 25) extractabilityScore += 15;
      else if (sentenceStats.avgLength >= 8) extractabilityScore += 10;

      // Structured content (20 points)
      if (hasTableOfContents) extractabilityScore += 5;
      if (hasSummary) extractabilityScore += 5;
      if (contentSections > 2) extractabilityScore += 5;
      if (readability.hasHeadings) extractabilityScore += 5;

      // Metadata (15 points)
      if (hasAuthor) extractabilityScore += 5;
      if (hasTimestamps) extractabilityScore += 5;
      if (readability.hasLists) extractabilityScore += 5;

      // Readability features (10 points)
      if (readability.hasBoldOrEmphasis) extractabilityScore += 5;
      if (readability.hasBlockquotes) extractabilityScore += 5;

      return {
        wordCount: words.length,
        characterCount: allText.length,
        paragraphs: paragraphStats,
        sentences: sentenceStats,
        contentDensity: Math.round(contentDensity * 100) / 100,
        structure: {
          hasTableOfContents,
          hasSummary,
          hasTimestamps,
          hasAuthor,
          contentSections
        },
        codeBlocks,
        media,
        readability,
        extractabilityScore: Math.min(100, extractabilityScore)
      };
    });
  }
}

module.exports = ContentAnalysisGatherer;
