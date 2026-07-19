# SoberAI

> `# Lighthouse for the AI age` — score how readable your site is to machines.

SoberAI audits a website for AI-agent readability: can crawlers, agents, and
models actually read your content? It computes a weighted 0–100 score across
five categories and surfaces prioritized, AI-generated fixes. Open source,
local-first, no telemetry, no account.

[**Open the app →**](http://localhost:3000/app) ·
[GitHub](https://github.com/nitishagar/sober-ai) ·
[Releases](https://github.com/nitishagar/sober-ai/releases)

---

## What we score

Five categories, weighted into a single 0–100 overall score:

| Category | Weight | What it checks |
|----------|--------|----------------|
| SSR Readiness | 25% | Server-side rendering, JS dependency, crawlable HTML |
| Schema Coverage | 20% | Structured data, Schema.org implementation |
| Semantic Structure | 20% | HTML5 semantic elements, heading hierarchy |
| Content Extractability | 20% | Text readability, main-content isolation for LLMs |
| Machine Readability | 20% | `robots.txt`, sitemap, crawl signals for AI user-agents |

> Scores are normalized so the five categories always sum to 100.

---

## Quick start

```bash
# Clone and install
git clone https://github.com/nitishagar/sober-ai.git
cd sober-ai
npm install

# Build the frontend, then start the API
cd frontend && npm install && npm run build && cd ..
node src/api/server.js

# Open http://localhost:3000/app
```

Or launch the desktop app:

```bash
npm run electron:dev
```

Prefer a binary? Download from the
[Releases page](https://github.com/nitishagar/sober-ai/releases).

---

## Highlights

- **AI-powered recommendations** via configurable LLM providers (Ollama local, or
  BYO-key cloud: OpenAI / Anthropic / NVIDIA NIM)
- **Real-time progress** with SSE streaming during audits
- **Desktop application** powered by Electron — runs anywhere
- **No account, no telemetry** — completely free, no sign-up

---

## Technology stack

- **Runtime**: Node.js 22+
- **Desktop**: Electron
- **Framework**: Express.js
- **Browser Automation**: Playwright
- **LLM**: Ollama (local/cloud) or BYO-key cloud providers
- **Frontend**: React + Vite
- **Database**: SQLite via Prisma

---

## Next steps

- [Installation](getting-started/installation.md)
- [Quick Start](getting-started/quick-start.md)
- [Running Audits](guide/running-audits.md)
- [LLM Configuration](guide/llm-configuration.md)
- [API Reference](API.md)

## License

MIT License — see [LICENSE](https://github.com/nitishagar/sober-ai/blob/main/LICENSE).
