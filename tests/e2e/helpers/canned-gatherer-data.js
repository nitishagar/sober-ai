module.exports = {
  ssr: {
    ssr_html_size: 2000, csr_html_size: 2000,
    ssr_text_length: 200, csr_text_length: 200,
    content_in_ssr_percent: 100, js_required: false,
    critical_elements_ssr: { h1: 1, h2: 2, articles: 0, paragraphs: 3, images: 0, links: 5, forms: 0, buttons: 0 },
    critical_elements_csr: { h1: 1, h2: 2, articles: 0, paragraphs: 3, images: 0, links: 5, forms: 0, buttons: 0 },
    critical_elements_ratio: 100, ssr_readiness_score: 80, framework_hints: []
  },
  structuredData: {
    jsonLd: [], microdata: [], rdfa: false, totalSchemas: 0,
    schemaTypes: [], schemaCount: 0, coverageScore: 40, quality: [], errors: [],
    hasOrganization: false, hasWebSite: false, hasBreadcrumb: false,
    detected_industry: 'general',
    industry_specific_gaps: { required: [], recommended: [], criticalGaps: false, priorityScore: 60 }
  },
  semanticHTML: {
    semanticElements: { header: 1, nav: 1, main: 1, article: 0, section: 0, aside: 0, footer: 1, figure: 0, figcaption: 0 },
    semanticRatio: 5,
    headings: { h1: [{ text: 'Test', position: 0 }], h2: 2, h3: 0, h4: 0, h5: 0, h6: 0 },
    headingHierarchy: { valid: true, gaps: [], totalHeadings: 3 },
    lists: { ul: 1, ol: 0, dl: 0 },
    aria: { roles: [], landmarks: 0, labels: 0, descriptions: 0 },
    links: { total: 5, withText: 5, external: 1, descriptive: 3 },
    images: { total: 0, withAlt: 0, withDescriptiveAlt: 0 },
    forms: { total: 0, withLabels: 0 },
    hasMainLandmark: true, hasNavigation: true, hasHeader: true, hasFooter: true
  },
  contentAnalysis: {
    wordCount: 100, characterCount: 600,
    paragraphs: { total: 4, avgLength: 80, tooShort: 1, tooLong: 0 },
    sentences: { total: 10, avgLength: 12 },
    contentDensity: 25,
    structure: { hasTableOfContents: false, hasSummary: false, hasTimestamps: false, hasAuthor: false, contentSections: 1 },
    codeBlocks: { total: 0, preFormatted: 0 },
    media: { images: 0, videos: 0, audio: 0 },
    readability: { hasHeadings: true, hasLists: true, hasBoldOrEmphasis: false, hasBlockquotes: false },
    extractabilityScore: 55
  },
  machineReadability: {
    robots_txt_exists: true, robots_txt_allows_ai: true, robots_txt_blocks_ai: false,
    robots_ai_crawlers: { GPTBot: true, 'ChatGPT-User': true, 'anthropic-ai': true, CCBot: true, 'Google-Extended': true },
    llms_txt_exists: false,
    sitemap_exists: true, sitemap_parseable: true,
    og_title: 'Test Page', og_description: 'A test page', og_image: null,
    twitter_card: null, twitter_title: null, og_complete: false,
    response_time_ms: 500, is_https: true
  }
};
