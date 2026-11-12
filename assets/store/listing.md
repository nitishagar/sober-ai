# Chrome Web Store listing — SoberAI

## Name

SoberAI — AI Agent Website Auditor

## Short description (≤132 chars)

Audit any page for AI-agent readiness: SSR, structured data, semantics, extractability, machine readability.

## Category

Developer Tools

## Language

English

## Detailed description

SoberAI is Lighthouse for the AI Age — a free, open-source auditor that
scores how well a website works for AI agents, LLMs, and autonomous
browsing systems (GPTBot, ClaudeBot, PerplexityBot, and friends).

Run an audit on the page you're viewing and get:

- **Overall score + grade** across 5 weighted categories
- **SSR Readiness** — does the page work without JavaScript?
- **Schema Coverage** — JSON-LD / microdata / RDFa structured data
- **Semantic Structure** — landmarks, headings, links, alt text
- **Content Extractability** — readability for LLMs
- **Machine Readability** — robots.txt, llms.txt, sitemap, OpenGraph
- **AI recommendations** via your own key (OpenAI-compatible —
  OpenAI, NVIDIA NIM, or any /chat/completions endpoint), or
  finding-based guidance with no key at all

**How it works:** the extension sends the page URL to your SoberAI
backend (local by default: `http://localhost:3000`) and streams back
real-time progress. Your API key stays in the browser and is never saved
server-side. One-click jump to the full interactive report.

**Requirements:** the free SoberAI backend
(https://github.com/nitishagar/sober-ai) running locally or self-hosted.

**Privacy:** no accounts, no analytics, no tracking. Keys live in
`chrome.storage.local`. Full policy:
https://nitishagar.github.io/sober-ai/#/privacy
