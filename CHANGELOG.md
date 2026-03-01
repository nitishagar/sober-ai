# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-03-01

### Added
- Electron desktop application for Linux, Windows, and macOS
- Multi-provider LLM support (Ollama local/cloud, OpenAI)
- Settings UI for LLM provider configuration and API keys
- Provider abstraction layer (BaseProvider, OllamaProvider, OpenAIProvider)
- Lighthouse-style circular score gauges with animated SVG
- Real-time audit progress with SSE streaming and session reconnection
- Docsify documentation site at nitishagar.github.io/sober-ai
- GitHub Actions CI/CD (tests, Electron builds, docs deployment)
- Connection testing for LLM providers

### Changed
- Switched from PostgreSQL to SQLite for zero-config local storage
- Migrated from Docker-first to Electron desktop-first architecture
- License changed from Apache 2.0 to MIT
- Completely free with no sign-up required

### Removed
- User authentication (JWT, bcrypt)
- PostgreSQL and Redis dependencies
- Rate limiting and usage tracking
- Docker as primary deployment method

## [0.2.1] - 2025-11-01

### Changed
- **BREAKING**: Consolidated `backend/src/` into `src/` for cleaner project structure
- Updated all import paths to use unified source directory
- Prisma schema now located at `src/db/schema.prisma`

## [0.2.0] - 2025-10-31

### Added
- Real-time progress updates via Server-Sent Events (SSE)
- Frontend UI with React and Vite
- Audit session management
- Database migrations with Prisma

### Changed
- Migrated from in-memory to database storage
- Enhanced error handling and logging

## [0.1.0] - 2025-10-02

### Added
- Initial release
- Core audit engine with 4 primary audits
- SSR (Server-Side Rendering) detection and scoring
- Schema.org coverage analysis
- Semantic HTML structure evaluation
- Content extractability scoring
- LLM-powered recommendations using Ollama
- Basic web UI for audit submission
- REST API for programmatic access
- Weighted scoring system
- Industry detection
- YAML-based configuration

### Technical
- Node.js 22+ support
- Playwright for browser automation
- Express.js API server

[0.3.0]: https://github.com/nitishagar/sober-ai/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/nitishagar/sober-ai/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/nitishagar/sober-ai/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nitishagar/sober-ai/releases/tag/v0.1.0
