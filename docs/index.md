---
layout: default
title: Home
---

# SoberAI Optimizer

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Stars](https://img.shields.io/github/stars/nitishagar/sober-ai)](https://github.com/nitishagar/sober-ai/stargazers)

**Lighthouse for the AI Age** - A comprehensive website auditing tool specifically designed to evaluate and optimize websites for AI agent interactions.

---

## Why SoberAI?

With over **1 billion monthly AI crawler requests** from services like GPTBot, ClaudeBot, and PerplexityBot, optimizing your website for AI visibility is no longer optional—it's essential.

SoberAI Optimizer is the first specialized tool for ensuring your website works perfectly with AI agents, LLMs, and autonomous browsing systems.

## Key Features

- **SSR Detection (25% weight)** - Critical for AI agents that don't execute JavaScript
- **Schema.org Coverage (20%)** - Structured data for AI understanding
- **Semantic HTML Analysis (20%)** - Proper content hierarchy and structure
- **Content Extractability (20%)** - Optimized for LLM comprehension
- **AI-Powered Recommendations** - Using Qwen3 4B for actionable insights

## Quick Start

Get started with SoberAI in under 2 minutes:

```bash
# Clone the repository
git clone https://github.com/nitishagar/sober-ai.git
cd sober-ai

# Install dependencies
npm install

# Start all services (Docker Compose)
npm run local:start

# Access the application
open http://localhost:5173
```

That's it! The unified Docker setup handles:
- PostgreSQL database
- Redis cache
- Ollama LLM (auto-downloads Qwen3 4B model)
- Backend API with hot-reload
- Frontend with hot-reload

## Documentation

- [Full README](../README.md)
- [API Documentation](API.md)
- [Architecture Guide](ARCHITECTURE.md)
- [Contributing Guidelines](../CONTRIBUTING.md)
- [Security Policy](../SECURITY.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Changelog](../CHANGELOG.md)

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Browser Automation**: Playwright
- **LLM**: Qwen3 4B via Ollama
- **Frontend**: React + Vite
- **Database**: PostgreSQL
- **Cache**: Redis
- **Queue**: Bull

## Example Audit Results

SoberAI analyzes your website across multiple dimensions:

| Category | Weight | What It Checks |
|----------|--------|----------------|
| SSR Readiness | 25% | Server-side rendering, JavaScript dependency |
| Schema Coverage | 20% | Structured data, Schema.org implementation |
| Semantic Structure | 20% | HTML5 semantic elements, heading hierarchy |
| Content Extractability | 20% | Text readability, content accessibility for LLMs |

**Overall Score**: Weighted average with letter grade (A-F)

## Open Source & Contributions

SoberAI is open source under the Apache 2.0 license. We welcome contributions!

- [View Source on GitHub](https://github.com/nitishagar/sober-ai)
- [Report Issues](https://github.com/nitishagar/sober-ai/issues)
- [Join Discussions](https://github.com/nitishagar/sober-ai/discussions)
- [Contributing Guide](../CONTRIBUTING.md)

## Support

- **Issues**: [GitHub Issues](https://github.com/nitishagar/sober-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nitishagar/sober-ai/discussions)
- **Security**: [Report Vulnerabilities](https://github.com/nitishagar/sober-ai/security/advisories/new)

## License

Licensed under the Apache License 2.0 - see [LICENSE](../LICENSE) for details.

Copyright © 2025 [Nitish Agarwal](https://github.com/nitishagar)

---

**Version 0.2.0** | [View Changelog](../CHANGELOG.md) | [GitHub Repository](https://github.com/nitishagar/sober-ai)
