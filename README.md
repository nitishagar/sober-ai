# SoberAI Optimizer

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![GitHub Issues](https://img.shields.io/github/issues/nitishagar/sober-ai)](https://github.com/nitishagar/sober-ai/issues)
[![GitHub Stars](https://img.shields.io/github/stars/nitishagar/sober-ai)](https://github.com/nitishagar/sober-ai/stargazers)
[![Version](https://img.shields.io/badge/version-0.2.0-orange.svg)](https://github.com/nitishagar/sober-ai/releases)

![sober-ai(2)](https://github.com/user-attachments/assets/ae07e349-880c-49fe-812b-8f1063abf593)

**Lighthouse for the AI Age** - A comprehensive website auditing tool specifically designed to evaluate and optimize websites for AI agent interactions.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Usage](#usage)
- [Testing](#testing)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Overview

SoberAI Optimizer is the first specialized tool for ensuring your website works perfectly with AI agents, LLMs, and autonomous browsing systems. With 1 billion+ monthly AI crawler requests (GPTBot, ClaudeBot, PerplexityBot), optimizing for AI visibility is no longer optional.

### Key Features

- **SSR Detection (25% weight)** - Critical for AI agents that don't execute JavaScript
- **Schema.org Coverage (20%)** - Structured data for AI understanding
- **Semantic HTML Analysis (20%)** - Proper content hierarchy and structure
- **Content Extractability (20%)** - Optimized for LLM comprehension
- **AI-Powered Recommendations** - Using Qwen3 4B for actionable insights

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop with Docker Compose
- 8GB+ RAM available
- macOS (ARM/Intel) or Linux

### Unified Local Development Setup

The easiest way to get started is using the unified Docker Compose setup that includes all services (PostgreSQL, Redis, Ollama, Backend, Frontend):

1. **Clone and Install**

```bash
git clone https://github.com/nitishagar/sober-ai.git
cd sober-ai
npm install
```

2. **Start All Services**

```bash
# Start unified Docker environment (database, Redis, Ollama, backend, frontend)
npm run local:start

# This will:
# - Start PostgreSQL database
# - Start Redis cache
# - Start Ollama with automatic Qwen3 4B model download (~2.5GB, first time only)
# - Run database migrations
# - Start backend API with hot-reload
# - Start frontend with hot-reload
```

3. **Access the Application**

- **Web UI**: http://localhost:5173
- **API**: http://localhost:3001/api
- **API Health**: http://localhost:3001/api/health
- **Ollama**: http://localhost:11434

4. **Verify Installation**

```bash
# Check all services are running
npm run local:ps

# Check logs
npm run local:logs

# Test API health
curl http://localhost:3001/api/health

# Test audit endpoint
curl -X POST http://localhost:3001/api/audits \
  -H "Content-Type: application/json" \
  -d '{"url":"https://vercel.com"}'
```

5. **Stop Services**

```bash
# Stop all services
npm run local:stop
```

### Alternative: Development Setup

For development without Docker (requires manual PostgreSQL, Redis, Ollama setup):

```bash
# Install dependencies
npm install

# Start frontend dev server
npm run dev

# Start backend API
npm start
```

## Architecture

### Technology Stack

- **Runtime**: Node.js 20+ (ARM-optimized)
- **Framework**: Express.js
- **Browser Automation**: Playwright
- **LLM**: Qwen3 4B via Ollama
- **Configuration**: YAML
- **Testing**: Jest + Playwright Test

### Project Structure

```
sober-ai/
├── src/
│   ├── api/                  # Express API server
│   │   ├── routes/          # API endpoints (Phase 1 + Phase 2)
│   │   ├── middleware/      # Auth + error handling
│   │   └── server.js        # Main entry point
│   ├── core/                # Core orchestration
│   │   ├── auditor.js       # Main audit coordinator
│   │   └── scorer.js        # Weighted scoring
│   ├── gatherers/           # Data collection
│   │   ├── ssr-detection.js
│   │   ├── structured-data.js
│   │   ├── semantic-html.js
│   │   └── content-analysis.js
│   ├── audits/              # Evaluation logic
│   │   ├── ssr-readiness.audit.js
│   │   ├── schema-coverage.audit.js
│   │   ├── semantic-structure.audit.js
│   │   └── content-extractability.audit.js
│   ├── llm/                 # LLM integration
│   │   ├── analyzer.js
│   │   └── prompts/
│   ├── db/                  # Database (Prisma)
│   │   ├── schema.prisma   # Database schema
│   │   ├── migrations/      # Migration files
│   │   └── seed.js          # Seed data
│   ├── services/            # Business logic services
│   │   ├── authService.js
│   │   └── reportService.js
│   ├── queue/               # Bull queue jobs
│   ├── ui/                  # Phase 1 web interface
│   │   └── public/
│   ├── config/              # YAML configuration
│   └── utils/               # Shared utilities
├── frontend/                # Phase 2 React UI
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── docker/                  # Docker configuration
├── tests/                   # Test suites
└── docs/                    # Documentation
```

## Usage

### Web UI

1. Navigate to http://localhost:3000
2. Enter a website URL (e.g., https://vercel.com)
3. Click "Run AI Agent Audit"
4. Review results (~15-20 seconds)
5. Download JSON report if needed

### API Usage

#### Single URL Audit

```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'
```

Response:
```json
{
  "id": "uuid",
  "url": "https://example.com",
  "timestamp": "2025-10-02T...",
  "duration": 18543,
  "scores": {
    "overall": 85,
    "grade": "B",
    "categories": {
      "ssrReadiness": { "score": 90, "severity": "pass" },
      "schemaCoverage": { "score": 75, "severity": "pass" },
      "semanticStructure": { "score": 88, "severity": "pass" },
      "contentExtractability": { "score": 82, "severity": "pass" }
    }
  },
  "auditResults": { ... },
  "recommendations": { ... },
  "metadata": {
    "detectedIndustry": "saas",
    "totalSchemas": 5,
    "ssrEnabled": true
  }
}
```

#### Get Audit Result

```bash
curl http://localhost:3000/api/audit/{id}
```

### Configuration

Edit `src/config/audits.yaml` to customize:

- Audit weights (must sum to 100)
- Scoring thresholds
- Industry detection rules
- Output formats

Edit `src/config/models.yaml` to customize:

- LLM model settings
- Temperature, top_p parameters
- Timeout and performance settings

## Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

### Manual Testing

Test with known websites:

- **SSR Excellence**: https://vercel.com (Next.js)
- **Schema Excellence**: https://shopify.com
- **Poor SSR**: https://youtube.com (SPA)

## Performance

### Expected Metrics

- **Audit Time**: 15-20 seconds per URL
- **SSR Detection**: ~10 seconds
- **LLM Analysis**: ~10 seconds (per failing audit)
- **Memory Usage**: ~2GB (app) + ~5GB (Ollama)
- **Concurrent Capacity**: 1-2 audits (Phase 1)

### Optimization Tips

- LLM recommendations only generated for failing audits
- Gatherers run in parallel where possible
- Single browser instance reused per audit
- In-memory results cache (last 100 audits)

## Troubleshooting

### Ollama Service Not Starting

```bash
# Check logs
npm run local:logs

# Or check Ollama specifically
docker logs sober-ollama-local

# Verify model is downloaded
docker exec sober-ollama-local ollama list

# Verify model is working
curl http://localhost:11434/api/tags
```

### Playwright Browser Issues

```bash
# Install system dependencies (Linux)
npx playwright install-deps chromium

# Use bundled Chromium (already configured in Dockerfile)
```

### Memory Issues on ARM Macs

If experiencing OOM kills:
- Close other memory-intensive applications
- Increase Docker memory limit to 10GB+
- Consider using smaller model (though not recommended)

## Development

### Code Style

```bash
# Lint code
npm run lint

# Format code
npm run format
```

### Hot Reload

```bash
# Uses nodemon for automatic restart on file changes
npm run dev
```

## Deployment

### Docker Production Build

```bash
# Build production image
npm run docker:build

# Start production containers
docker-compose -f docker/docker-compose.yml up -d
```

### Environment Variables

```bash
PORT=3000
NODE_ENV=production
OLLAMA_ENDPOINT=http://ollama:11434
LOG_LEVEL=info
```

## Roadmap

### Phase 1 (Current) ✅
- Core audit engine
- 4 primary audits
- LLM-powered recommendations
- Minimal web UI
- Docker deployment

### Phase 2 (Planned)
- Redis queue for batch processing
- Report persistence (database)
- API rate limiting
- Enhanced error handling
- Comprehensive monitoring

### Phase 3 (Planned)
- Chrome extension
- CLI tool
- Advanced caching
- Multiple LLM providers

### Phase 4 (Planned)
- User authentication
- Team collaboration
- API keys and quotas
- White-label options

## Contributing

We welcome contributions from the community! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:

- Development setup
- Code style and standards
- Testing requirements
- Pull request process
- Code of Conduct

Before contributing, please read:
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/nitishagar/sober-ai/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nitishagar/sober-ai/discussions)
- **Security**: Report vulnerabilities via [Security Advisories](https://github.com/nitishagar/sober-ai/security/advisories/new)
- **Documentation**:
  - [API Documentation](docs/API.md)
  - [Architecture Guide](docs/ARCHITECTURE.md)
  - [Contributing Guidelines](CONTRIBUTING.md)
  - [Security Policy](SECURITY.md)

## Credits

Built with insights from:
- Lighthouse architecture (Google Chrome)
- AI crawler behavior research
- Schema.org best practices
- Community feedback from AI/web dev communities

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and release notes.

---

**Version 0.2.0** - Last updated: 2025-11-01
