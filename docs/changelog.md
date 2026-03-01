# Changelog

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
