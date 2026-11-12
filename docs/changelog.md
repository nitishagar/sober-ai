# Changelog

## v0.4.0 (2026-11-12)

### Major Changes
- **OpenAI-compatible key is the default AI path** - OpenAI, NVIDIA NIM, or any `/chat/completions` endpoint; Ollama stays opt-in; missing keys degrade to finding-based fallbacks
- **Chrome extension (MV3)** - audit the active tab via the local backend, BYO key kept in the browser, store submission package included
- **Brand + privacy** - Lighthouse-inspired logo and icon set, privacy policy page

### New Features
- Batch audit engine (sequential drain, status polling, webhook delivery)
- Evalite offline evaluation gate
- Provider-aware health endpoint and Audit readiness banner
- Store screenshots generator (`npm run store:screenshots`)

### Fixed
- CORS wildcard default now actually emits headers (extension-grade cross-origin)
- Backend hardening: SSRF parity, atomic delete, shared rate limiter
- Frontend resilience: BYO reconnect headers, fetch abort hygiene
- Lockfile re-synced; dead session map removed; picker refetch loop fixed

## v0.3.0 (2026-03-01)

### Major Changes
- **Removed authentication** - SoberAI is now completely free with no sign-up required
- **Electron desktop app** - runs as a native desktop application on Linux, Windows, and macOS
- **SQLite database** - replaced PostgreSQL for zero-config local storage
- **Multi-provider LLM** - support for Ollama (local/cloud) and OpenAI
- **Settings UI** - configure LLM provider, API keys, and models through the app

### New Features
- Settings page with provider selection and connection testing
- Provider abstraction layer (BaseProvider, OllamaProvider, OpenAIProvider)
- GitHub Actions CI/CD (tests, Electron builds, docs deployment)
- Docsify documentation site

### Removed
- User authentication (JWT, bcrypt)
- PostgreSQL and Redis dependencies
- Rate limiting and usage tracking
- Docker as primary deployment method

## v0.2.0 (2026-02-28)

### Features
- Real-time audit progress with SSE streaming
- Lighthouse-style UI with circular score gauges
- Session reconnection for interrupted audits
- Report comparison view

## v0.1.0 (2026-02-15)

### Initial Release
- 4 core audits: SSR, Schema, Semantic, Content
- AI-powered recommendations via Ollama
- React frontend with Vite
- Express.js backend
- PostgreSQL database
