# SoberAI Optimizer

**Lighthouse for the AI Age** - A free, open-source desktop application that audits websites for AI agent optimization.

## Why SoberAI?

With over **1 billion monthly AI crawler requests** from GPTBot, ClaudeBot, and PerplexityBot, optimizing your website for AI visibility is essential. SoberAI is the first specialized tool for ensuring your website works perfectly with AI agents, LLMs, and autonomous browsing systems.

## Key Features

| Category | Weight | What It Checks |
|----------|--------|----------------|
| SSR Readiness | 25% | Server-side rendering, JavaScript dependency |
| Schema Coverage | 20% | Structured data, Schema.org implementation |
| Semantic Structure | 20% | HTML5 semantic elements, heading hierarchy |
| Content Extractability | 20% | Text readability, content accessibility for LLMs |

- **AI-Powered Recommendations** via configurable LLM providers (Ollama or OpenAI)
- **Real-time progress** with SSE streaming during audits
- **Desktop application** powered by Electron - runs anywhere
- **No account required** - completely free, no sign-up

## Quick Start

```bash
# Clone and install
git clone https://github.com/nitishagar/sober-ai.git
cd sober-ai
npm install

# Install frontend dependencies and build
cd frontend && npm install && npm run build && cd ..

# Start the server
node src/api/server.js

# Open http://localhost:3000
```

Or download the desktop app from the [Releases page](https://github.com/nitishagar/sober-ai/releases).

## Technology Stack

- **Runtime**: Node.js 22+
- **Desktop**: Electron
- **Framework**: Express.js
- **Browser Automation**: Playwright
- **LLM**: Ollama (local/cloud) or OpenAI
- **Frontend**: React + Vite
- **Database**: SQLite via Prisma

## Documentation

- [Installation Guide](getting-started/installation.md)
- [Quick Start](getting-started/quick-start.md)
- [Running Audits](guide/running-audits.md)
- [LLM Configuration](guide/llm-configuration.md)
- [API Reference](API.md)
- [Architecture](ARCHITECTURE.md)

## License

MIT License - see [LICENSE](https://github.com/nitishagar/sober-ai/blob/main/LICENSE) for details.
