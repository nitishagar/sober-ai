# Architecture

## Overview

SoberAI is a desktop application (Electron) that audits websites for AI agent optimization. It bundles an Express.js backend, React frontend, SQLite database, and configurable LLM integration.

## System Components

```
┌─────────────────────────────────────────────────┐
│                 Electron Shell                    │
│                                                   │
│  ┌───────────────┐    ┌──────────────────────┐   │
│  │  React + Vite  │◄──►│  Express.js Backend  │   │
│  │  (BrowserWindow)│    │  (in-process)        │   │
│  └───────────────┘    └──────────┬───────────┘   │
│                                   │               │
│                    ┌──────────────┼──────────┐   │
│                    ▼              ▼          ▼   │
│              ┌──────────┐ ┌──────────┐ ┌─────┐ │
│              │ Playwright│ │ LLM      │ │SQLite│ │
│              │ (browser) │ │ Provider │ │ (DB) │ │
│              └──────────┘ └──────────┘ └─────┘ │
│                                │                 │
│                    ┌───────────┴──────────┐     │
│                    ▼           ▼          ▼     │
│              ┌──────────┐ ┌────────┐ ┌───────┐ │
│              │ Ollama   │ │ Ollama │ │OpenAI │ │
│              │ (Local)  │ │ (Cloud)│ │       │ │
│              └──────────┘ └────────┘ └───────┘ │
└─────────────────────────────────────────────────┘
```

## Core Pipeline

### Audit Flow

1. User submits URL via React frontend
2. Frontend POSTs to `/api/audit-progress` (SSE endpoint)
3. Backend creates Auditor with LLM provider settings from database
4. **Phase 1 - Gathering** (30%): Playwright collects website data
   - SSR detection (separate HTTP requests)
   - Schema.org extraction (page evaluation)
   - Semantic HTML analysis (DOM traversal)
   - Content analysis (text metrics)
5. **Phase 2 - Auditing** (5%): Each audit module scores its data
6. **Phase 3 - Scoring** (5%): Weighted average + letter grade
7. **Phase 4 - Recommendations** (60%): LLM analyzes failing audits
8. Report saved to SQLite, results streamed to frontend

### Key Files

| Component | Path |
|-----------|------|
| Audit orchestrator | `src/core/auditor.js` |
| Scorer | `src/core/scorer.js` |
| Gatherers | `src/gatherers/*.js` |
| Audit modules | `src/audits/*.audit.js` |
| LLM analyzer | `src/llm/analyzer.js` |
| LLM providers | `src/llm/providers/*.js` |
| Prompt templates | `src/llm/prompts/*.txt` |
| API routes | `src/api/routes/*.js` |
| Electron main | `src/electron/main.js` |
| React frontend | `frontend/src/` |

## LLM Provider Architecture

```
LLMAnalyzer
    │
    ▼
ProviderFactory.create(settings)
    │
    ├── OllamaProvider  → POST /api/generate
    │     ├── Local (no auth)
    │     └── Cloud (Bearer token)
    │
    └── OpenAIProvider  → POST /v1/chat/completions
          └── Bearer API key
```

Each provider implements:
- `generate(prompt, onProgress)` - completion with optional streaming
- `testConnection()` - connectivity and model availability check

Settings are stored in the `Settings` SQLite table and loaded at audit time.

## Database

SQLite via Prisma ORM. Two tables:

- **Report** - audit results with JSON stored as strings
- **Settings** - key-value store for LLM configuration

In Electron mode, the database is stored in the user's app data directory.

## Configuration

- `src/config/audits.yaml` - audit weights, thresholds, industry rules
- `src/config/models.yaml` - default LLM model settings

## Scoring

Weighted scoring with configurable weights (default):

| Category | Weight |
|----------|--------|
| SSR Readiness | 25% |
| Schema Coverage | 20% |
| Semantic Structure | 20% |
| Content Extractability | 20% |
| Reserved | 15% |

Grades: A (90+), B (80-89), C (70-79), D (60-69), F (<60)

## Performance

- **Typical audit**: 15-30 seconds
- **Data gathering**: 8-12 seconds (Playwright)
- **LLM recommendations**: 8-15 seconds per failing audit
- **Memory**: ~500MB (Playwright browser) + LLM model size
