# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-11-01

### Changed
- **BREAKING**: Consolidated `backend/src/` into `src/` for cleaner project structure
- Updated all import paths to use unified source directory
- Updated Docker configuration to reflect new structure
- Prisma schema now located at `src/db/schema.prisma` (was `backend/src/db/schema.prisma`)
- All npm scripts updated to reference `src/` instead of `backend/src/`
- Updated README project structure documentation to match actual implementation

### Migration Guide
If you have an existing local development environment:
1. Pull latest changes: `git pull`
2. Remove old dependencies: `rm -rf node_modules`
3. Reinstall dependencies: `npm install`
4. Regenerate Prisma client: `npm run db:generate`
5. Rebuild Docker images: `docker-compose -f docker-compose.local.yml build`
6. Restart services: `npm run local:stop && npm run local:start`

## [Unreleased]

### Added
- Full Docker Compose setup for one-command local development
- Comprehensive project documentation
  - CONTRIBUTING.md with contribution guidelines
  - CODE_OF_CONDUCT.md for community standards
  - SECURITY.md for vulnerability reporting
  - docs/ARCHITECTURE.md with system architecture details
- Unified docker-compose.local.yml with all services
- Automatic Ollama model download on first startup
- Health check endpoint at /api/health

### Changed
- Improved documentation structure and completeness
- Updated health endpoint to /api/health with service status
- Enhanced local development workflow with npm scripts

### Fixed
- Removed hardcoded personal paths for portability

## [0.2.0] - 2025-10-31

### Added
- User authentication with JWT
- PostgreSQL database for persistence
- Redis queue system for async processing
- Audit session management
- Frontend UI with React and Vite
- Real-time progress updates via Server-Sent Events (SSE)
- User registration and login
- Protected audit endpoints
- Database migrations with Prisma

### Changed
- Migrated from in-memory to database storage
- Enhanced error handling and logging
- Improved API structure with authentication

### Security
- Implemented JWT-based authentication
- Added bcrypt password hashing
- Environment-based configuration for secrets

## [0.1.0] - 2025-10-02

### Added
- Initial release
- Core audit engine with 4 primary audits
- SSR (Server-Side Rendering) detection and scoring
- Schema.org coverage analysis
- Semantic HTML structure evaluation
- Content extractability scoring
- LLM-powered recommendations using Qwen3 4B via Ollama
- Docker deployment support
- Basic web UI for audit submission
- REST API for programmatic access
- Weighted scoring system
- Industry detection
- YAML-based configuration

### Technical
- Node.js 20+ support
- Playwright for browser automation
- Express.js API server
- ARM-optimized containers

[Unreleased]: https://github.com/nitishagar/sober-ai/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/nitishagar/sober-ai/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nitishagar/sober-ai/releases/tag/v0.1.0
