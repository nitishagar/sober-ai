# SoberAI Optimizer

**Lighthouse for the AI Age** - A comprehensive website auditing tool specifically designed to evaluate and optimize websites for AI agent interactions.

## Overview

SoberAI Optimizer is the first specialized tool for ensuring your website works perfectly with AI agents, LLMs, and autonomous browsing systems. With 1 billion+ monthly AI crawler requests (GPTBot, ClaudeBot, PerplexityBot), optimizing for AI visibility is no longer optional.

### Key Features

- **SSR Detection (25% weight)** - Critical for AI agents that don't execute JavaScript
- **Schema.org Coverage (20%)** - Structured data for AI understanding
- **Semantic HTML Analysis (20%)** - Proper content hierarchy and structure
- **Content Extractability (20%)** - Optimized for LLM comprehension
- **AI-Powered Recommendations** - Using Qwen2.5-7B for actionable insights

## Quick Start

### Prerequisites

- Node.js 20+ (for ARM Macs)
- Docker Desktop (for containerized deployment)
- 8GB+ RAM available
- macOS (ARM/Intel) or Linux

### Local Development Setup

1. **Install Dependencies**

```bash
npm install
```

2. **Start Docker Services**

```bash
# Build and start all services (Ollama + App)
docker-compose -f docker/docker-compose.yml up -d

# Or use the npm script
npm run docker:up
```

3. **Pull the Qwen2.5-7B Model**

```bash
# This downloads the ~4.5GB model (one-time operation)
npm run ollama:pull

# Or manually:
docker exec sober-ollama ollama pull qwen2.5:7b
```

4. **Start Development Server**

```bash
# With hot-reload
npm run dev

# Or without hot-reload
npm start
```

5. **Access the Application**

- **Web UI**: http://localhost:3000
- **API**: http://localhost:3000/api/audit
- **Ollama**: http://localhost:11434

### Verify Installation

```bash
# Check if services are running
docker ps

# Should see:
# - sober-app (Node.js application)
# - sober-ollama (Ollama with Qwen2.5-7B)

# Check Ollama health
curl http://localhost:11434/api/tags

# Test audit endpoint
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"url":"https://vercel.com"}'
```

## Architecture

### Technology Stack

- **Runtime**: Node.js 20+ (ARM-optimized)
- **Framework**: Express.js
- **Browser Automation**: Playwright
- **LLM**: Qwen2.5-7B via Ollama
- **Configuration**: YAML
- **Testing**: Jest + Playwright Test

### Project Structure

```
sober-ai/
├── src/
│   ├── api/                  # Express API server
│   │   ├── routes/          # API endpoints
│   │   └── middleware/      # Error handling
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
│   ├── ui/                  # Web interface
│   │   └── public/
│   ├── config/              # YAML configuration
│   └── utils/               # Shared utilities
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
docker logs sober-ollama

# Restart service
docker-compose -f docker/docker-compose.yml restart ollama

# Verify model is downloaded
docker exec sober-ollama ollama list
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

This is currently a Phase 1 implementation. Contributions welcome after public beta launch.

## License

MIT (to be confirmed)

## Support

- **Issues**: GitHub Issues (when repository is public)
- **Documentation**: `/docs` directory
- **API Docs**: `/docs/API.md`

## Credits

Built with insights from:
- Lighthouse architecture (Google Chrome)
- AI crawler behavior research
- Schema.org best practices
- Community feedback from AI/web dev communities

---

**Phase 1 Beta** - Last updated: 2025-10-02
