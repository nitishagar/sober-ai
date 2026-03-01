# Understanding Results

## Overall Score

Your website receives a score from 0-100 with a letter grade:

| Grade | Score Range | Meaning |
|-------|-------------|---------|
| A | 90-100 | Excellent AI-readiness |
| B | 80-89 | Good, minor improvements possible |
| C | 70-79 | Needs improvement in key areas |
| D | 60-69 | Significant gaps in AI optimization |
| F | 0-59 | Major work needed for AI agents |

## Category Scores

### SSR Readiness (25% weight)

Checks if your website content is available without JavaScript execution. AI crawlers (GPTBot, ClaudeBot) typically don't run JavaScript.

**What it checks:**
- HTML content available in initial server response
- JavaScript-rendered vs server-rendered content ratio
- Critical content accessibility without JS

**High score means:** AI agents can read your content directly from the HTML.

### Schema Coverage (20% weight)

Evaluates structured data (Schema.org) that helps AI understand your content semantically.

**What it checks:**
- JSON-LD, Microdata, or RDFa markup present
- Schema types appropriate for your industry
- Required properties filled out
- Schema validation errors

**High score means:** AI agents understand what your pages are about (products, articles, organizations, etc.).

### Semantic Structure (20% weight)

Analyzes proper use of HTML5 semantic elements for content hierarchy.

**What it checks:**
- Heading hierarchy (h1-h6) without skips
- Semantic landmarks (`<main>`, `<nav>`, `<article>`, `<section>`)
- ARIA attributes for accessibility
- Document outline quality

**High score means:** AI agents can navigate your content structure and identify key sections.

### Content Extractability (20% weight)

Measures how easily AI agents can extract meaningful text from your pages.

**What it checks:**
- Text-to-HTML ratio
- Content readability score
- Descriptive link text (vs "click here")
- Image alt text coverage
- Content density and structure

**High score means:** AI agents can efficiently extract and summarize your content.

## AI Recommendations

Each recommendation includes:

- **Priority** - numbered ranking by importance
- **Title** - what to fix
- **Impact** - expected improvement (High/Medium/Low)
- **Effort** - implementation difficulty (High/Medium/Low)
- **Description** - detailed explanation
- **Why It Matters** - context for AI optimization
- **Code Example** - specific implementation guidance

Focus on high-impact, low-effort recommendations first for the best return on investment.
