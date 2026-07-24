# We Built an Open-Source Lighthouse for AI Agents — Here's What We Learned

Google Lighthouse changed how we build for the web. It gave developers a single score and clear, actionable fixes for performance, accessibility, and SEO. But Lighthouse was built for a world where humans are the users.

That world is changing fast.

## The Problem Nobody's Measuring

Over 1 billion monthly requests now come from AI crawlers — GPTBot, ClaudeBot, PerplexityBot, and dozens more. These aren't traditional search engine spiders. They're LLM-powered agents that need to *understand* your content, not just index it.

And most websites are completely unprepared.

I spent weeks reading through AI crawler documentation, watching how LLMs fail on real websites, and studying what makes content machine-readable. The patterns were clear:

- **SPAs are invisible** — AI agents don't execute JavaScript. Your React app is a blank page to them.
- **Missing structured data** — Without Schema.org markup, AI agents can't distinguish your product page from your blog.
- **Poor semantic HTML** — Nested `<div>` soup is as unreadable to AI agents as it is to screen readers.
- **Inaccessible content** — Text locked behind modals, accordions, and infinite scroll is lost.

There was no tool that audited for these problems. So I built one.

## Introducing SoberAI

[SoberAI](https://github.com/nitishagar/sober-ai) is a free, open-source auditing tool that scores your website's readiness for AI agents. Think of it as Lighthouse, but instead of measuring page load speed, it measures how well AI systems can understand your content.

You give it a URL, it gives you a score (0-100) across five categories:

| Category | Weight | What It Measures |
|----------|--------|------------------|
| SSR Readiness | 20% | Can AI agents see your content without JavaScript? |
| Schema Coverage | 20% | Is your structured data complete and correct? |
| Semantic Structure | 20% | Are you using HTML5 semantic elements properly? |
| Content Extractability | 20% | Can LLMs actually parse your text content? |
| Machine Readability | 20% | Can AI crawlers discover and access your content (robots.txt, llms.txt, sitemap, OpenGraph)? |

Each category comes with specific findings, severity ratings, and AI-powered recommendations for fixing issues.

## The Technical Bits (For HN)

A few engineering decisions that might interest you:

### Dual-Context SSR Detection

The most interesting auditor is SSR detection. Instead of checking for meta-framework headers or guessing, we actually render your page twice using Playwright:

```javascript
// Context 1: JavaScript disabled (how AI agents see your site)
const contextNoJS = await browser.newContext({
  javaScriptEnabled: false,
  userAgent: 'SoberAI-Optimizer/1.0 (No-JS Mode)'
});

// Context 2: JavaScript enabled (how humans see your site)
const contextWithJS = await browser.newContext({
  javaScriptEnabled: true,
  userAgent: 'SoberAI-Optimizer/1.0 (JS Mode)'
});
```

Then we diff the content. If 80%+ of your visible text is present without JS, you pass. If not, we tell you exactly what's missing and why it matters for AI crawlers.

### Real-Time Streaming Progress

Audits take 30-60 seconds. Nobody wants to stare at a spinner. We use Server-Sent Events (SSE) with session management to stream progress in real-time:

- Phase-weighted ETAs (browser launch is slow, HTML parsing is fast)
- Concurrent LLM analysis progress tracking
- Session reconnection — if your connection drops mid-audit, reconnect and pick up where you left off

The frontend smooths the ETA with an exponential moving average so the timer doesn't jump around.

### Bring Your Own LLM

SoberAI generates recommendations using an LLM, but we don't lock you into any provider. The architecture uses a factory pattern:

```javascript
class ProviderFactory {
  static create(settings) {
    switch (settings.provider) {
      case 'ollama_local':  return new OllamaProvider({ ... });
      case 'ollama_cloud':  return new OllamaProvider({ ... });
      case 'openai':        return new OpenAIProvider({ ... });
      case 'anthropic':     return new AnthropicProvider({ ... });
    }
  }
}
```

Run Ollama locally for free with `qwen3:4b` (2.5GB). Or plug in your OpenAI key. No data ever leaves your machine unless you choose a cloud provider. There's a Settings page to configure and test your connection.

### Desktop-First, Zero Config

SoberAI is a web app — Express.js backend serving a React frontend with SQLite for storage via Prisma — that can optionally be wrapped by Electron (Express runs in-process with dynamic port allocation, React in a BrowserWindow). No PostgreSQL. No signup. Docker is available too via `docker-compose.local.yml` if you prefer to run it containerized.

```
npm install && npm run electron:dev
```

That's it. One command and you're auditing.

## What You Actually Get

When you run an audit, you get:

**A Lighthouse-style score** — Circular gauges for each category (0-100), color-coded from red to green. An overall weighted score that tells you at a glance how AI-ready your site is.

**Specific findings** — Not vague suggestions. Concrete issues like "Navigation links are only rendered client-side" or "Product schema is missing `price` and `availability` properties." Each finding has a severity (critical, warning, info) and the exact element or content that triggered it.

**AI-powered recommendations** — The LLM analyzes your audit results and generates prioritized, site-specific recommendations. Not generic advice — actual fixes tailored to your stack and content.

**Historical reports** — Every audit is saved. Compare scores over time. See if your fixes actually moved the needle.

## Why This Matters Now

The web is experiencing a fundamental shift in how content gets consumed. Consider:

- **Perplexity, ChatGPT Search, and Google AI Overviews** are replacing traditional search results with AI-generated summaries. If AI can't parse your content, you're invisible.
- **AI coding agents** browse documentation sites to answer developer questions. If your docs aren't SSR-rendered with proper structure, the agent hallucinates or gives outdated answers.
- **E-commerce AI agents** compare products across sites. Without proper Schema.org markup, your products don't exist in the comparison.
- **Content aggregation** by AI systems favors well-structured, machine-readable content. Poor semantic HTML means your insights get attributed to competitors with better markup.

This isn't speculative. Cloudflare reported that AI bot traffic has grown 30x in the past year. Companies are already hiring for "AI SEO" roles. The tools just haven't caught up.

## The Stack

For those who care about implementation details:

- **Desktop**: Electron with in-process Express server
- **Backend**: Node.js 22 + Express.js
- **Frontend**: React + Vite (vanilla CSS, no component library)
- **Database**: SQLite via Prisma ORM
- **Browser Automation**: Playwright (headless Chromium)
- **LLM**: Ollama (local/cloud), OpenAI, or Anthropic (cloud), your choice
- **Testing**: Jest unit + integration suites (Supertest), plus Playwright browser E2E
- **CI/CD**: GitHub Actions (tests, multi-platform builds, docs deployment)
- **Docs**: [nitishagar.github.io/sober-ai](https://nitishagar.github.io/sober-ai)

## Try It

```bash
git clone https://github.com/nitishagar/sober-ai.git
cd sober-ai && npm install
npm run electron:dev
```

Or download a pre-built binary from the [Releases page](https://github.com/nitishagar/sober-ai/releases).

MIT licensed. No telemetry. No accounts. No API keys required (LLM recommendations are optional).

If you find it useful, a star on GitHub helps more than you'd think. Issues and PRs welcome — there's a [Contributing Guide](https://nitishagar.github.io/sober-ai/#/contributing) and the codebase is straightforward (~3K lines of JS).

---

*SoberAI is v0.3.0. Active development — see the [Changelog](https://nitishagar.github.io/sober-ai/#/changelog) and [Roadmap](https://nitishagar.github.io/sober-ai/#/roadmap) for what's next.*

*[GitHub](https://github.com/nitishagar/sober-ai) | [Documentation](https://nitishagar.github.io/sober-ai) | [Issues](https://github.com/nitishagar/sober-ai/issues)*
