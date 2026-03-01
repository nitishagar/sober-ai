# SoberAI Optimizer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Issues](https://img.shields.io/github/issues/nitishagar/sober-ai)](https://github.com/nitishagar/sober-ai/issues)
[![GitHub Stars](https://img.shields.io/github/stars/nitishagar/sober-ai)](https://github.com/nitishagar/sober-ai/stargazers)
[![Version](https://img.shields.io/badge/version-0.3.0-orange.svg)](https://github.com/nitishagar/sober-ai/releases)
[![CI](https://github.com/nitishagar/sober-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/nitishagar/sober-ai/actions/workflows/ci.yml)

![sober-ai(2)](https://github.com/user-attachments/assets/ae07e349-880c-49fe-812b-8f1063abf593)

**Lighthouse for the AI Age** - A free, open-source website auditing tool that evaluates and optimizes websites for AI agent interactions.

## Overview

With 1 billion+ monthly AI crawler requests (GPTBot, ClaudeBot, PerplexityBot), optimizing for AI visibility is no longer optional. SoberAI is the first specialized tool for ensuring your website works perfectly with AI agents, LLMs, and autonomous browsing systems.

### What It Audits

| Category | Weight | Description |
|----------|--------|-------------|
| SSR Readiness | 25% | Server-side rendering for AI agents that don't execute JavaScript |
| Schema Coverage | 20% | Structured data (Schema.org) for AI understanding |
| Semantic Structure | 20% | HTML5 semantic elements and heading hierarchy |
| Content Extractability | 20% | Text readability and accessibility for LLMs |

AI-powered recommendations are generated using your choice of LLM provider (Ollama or OpenAI).

## Quick Start

### Option 1: Desktop App

Download the latest release for your platform from the [Releases page](https://github.com/nitishagar/sober-ai/releases).

### Option 2: From Source

```bash
# Clone and install
git clone https://github.com/nitishagar/sober-ai.git
cd sober-ai
npm install

# Build frontend
cd frontend && npm install && npm run build && cd ..

# Set up database
npx prisma generate --schema=src/db/schema.prisma
npx prisma migrate deploy --schema=src/db/schema.prisma

# Start the server
node src/api/server.js
# Open http://localhost:3000
```

### Option 3: Electron Development

```bash
npm run electron:dev
```

### LLM Setup (Optional)

For AI-powered recommendations, install [Ollama](https://ollama.com) and pull a model:

```bash
ollama pull qwen3:4b
```

Or configure OpenAI in Settings with your API key.

## Usage

1. Navigate to the **Audit** page
2. Enter a URL (e.g., `https://vercel.com`)
3. Click **Run Audit** and watch real-time progress
4. Review scores, findings, and AI recommendations
5. Configure your LLM provider in **Settings**

## Architecture

```
Electron Shell
├── React Frontend (BrowserWindow)
├── Express.js Backend (in-process)
├── SQLite Database (Prisma ORM)
├── Playwright (browser automation)
└── LLM Provider (Ollama local/cloud or OpenAI)
```

### Key Technologies

- **Desktop**: Electron
- **Backend**: Express.js + Node.js 22+
- **Frontend**: React + Vite
- **Database**: SQLite via Prisma
- **Browser**: Playwright
- **LLM**: Ollama (local/cloud) or OpenAI

## Testing

```bash
npm test          # Run all tests
npm run verify    # Run tests + lint
```

## Documentation

Full documentation available at [nitishagar.github.io/sober-ai](https://nitishagar.github.io/sober-ai).

- [Installation Guide](https://nitishagar.github.io/sober-ai/#/getting-started/installation)
- [Quick Start](https://nitishagar.github.io/sober-ai/#/getting-started/quick-start)
- [LLM Configuration](https://nitishagar.github.io/sober-ai/#/guide/llm-configuration)
- [API Reference](https://nitishagar.github.io/sober-ai/#/API)
- [Architecture](https://nitishagar.github.io/sober-ai/#/ARCHITECTURE)

## Contributing

We welcome contributions! See the [Contributing Guide](https://nitishagar.github.io/sober-ai/#/contributing) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

Copyright 2025-2026 Nitish Agarwal

## Support

- [GitHub Issues](https://github.com/nitishagar/sober-ai/issues)
- [GitHub Discussions](https://github.com/nitishagar/sober-ai/discussions)
- [Documentation](https://nitishagar.github.io/sober-ai)

---

**Version 0.3.0** | [Changelog](https://nitishagar.github.io/sober-ai/#/changelog)
