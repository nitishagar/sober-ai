# SoberAI Optimizer - Architecture Documentation

## Overview

SoberAI Optimizer is a comprehensive website auditing tool designed to evaluate and optimize websites for AI agent interactions. This document describes the system architecture, component interactions, and design decisions.

## High-Level Architecture

### System Components

1. **Frontend (React + Vite)**
   - User interface
   - Real-time progress updates
   - Results visualization

2. **Backend API (Express.js)**
   - REST API endpoints
   - Audit orchestration
   - Authentication

3. **Database (PostgreSQL)**
   - User accounts
   - Audit sessions
   - Historical results

4. **Queue System (Redis + Bull)**
   - Async job processing
   - Rate limiting
   - Caching

5. **LLM Service (Ollama)**
   - AI-powered recommendations
   - Qwen3 4B model
   - Local inference

### Architecture Diagram

```
[Frontend] <--HTTP--> [Backend API] <---> [PostgreSQL]
                           |
                           +--> [Redis Queue]
                           |
                           +--> [Ollama LLM]
                           |
                           +--> [Playwright Browser]
```

## Core Components

### 1. Audit Orchestrator (src/core/auditor.js)

Main coordinator that:
- Initializes browser instance
- Runs gatherers in parallel
- Executes audits sequentially
- Calculates weighted scores
- Generates LLM recommendations
- Streams progress updates

**Flow**:
1. Receive audit request
2. Validate URL
3. Initialize browser
4. Run gatherers (parallel)
5. Execute audits (sequential)
6. Calculate scores
7. Generate recommendations
8. Return results

### 2. Gatherers (src/gatherers/)

Data collection modules that extract information:

- **ssr-detection.js**: Checks server-side rendering
- **structured-data.js**: Extracts Schema.org markup
- **semantic-html.js**: Analyzes HTML structure
- **content-analysis.js**: Evaluates content quality

Each gatherer:
- Takes browser page object
- Collects specific data
- Returns structured results
- Handles errors gracefully

### 3. Audits (src/audits/)

Evaluation modules that score gathered data:

- **ssr-readiness.audit.js**: Scores SSR implementation
- **schema-coverage.audit.js**: Evaluates structured data
- **semantic-structure.audit.js**: Checks HTML semantics
- **content-extractability.audit.js**: Rates content quality

Each audit:
- Receives gatherer artifacts
- Applies scoring logic
- Returns score (0-100)
- Provides severity level
- Suggests improvements

### 4. Scorer (src/core/scorer.js)

Weighted scoring system:
- Applies category weights
- Calculates overall score
- Assigns letter grade
- Determines severity

**Default weights**:
- SSR Readiness: 25%
- Schema Coverage: 20%
- Semantic Structure: 20%
- Content Extractability: 20%
- Future audits: 15% (reserved)

### 5. LLM Analyzer (src/llm/analyzer.js)

AI recommendation engine:
- Analyzes failing audits
- Generates actionable advice
- Provides industry context
- Formats structured output

**Integration with Ollama**:
- HTTP API calls
- Streaming responses
- JSON parsing
- Fallback handling

## Data Flow

### Audit Request Flow

1. User submits URL via frontend
2. Frontend calls POST /api/audit
3. Backend creates audit session in database
4. Audit job added to Redis queue
5. Worker picks up job
6. Orchestrator runs audit pipeline:
   a. Gatherers collect data
   b. Audits evaluate data
   c. Scorer calculates results
   d. LLM generates recommendations
7. Results saved to database
8. Progress streamed to frontend via SSE
9. Final results displayed to user

### Authentication Flow

1. User enters credentials
2. Frontend calls POST /api/auth/login
3. Backend validates against database
4. JWT token generated and returned
5. Frontend stores token
6. Token included in subsequent requests
7. Backend middleware validates token
8. Request proceeds or 401 returned

## Database Schema

### Users Table
- id: UUID (primary key)
- email: String (unique)
- password: String (hashed)
- name: String
- company: String (optional)
- role: Enum (USER, ADMIN)
- plan: Enum (FREE, PRO, ENTERPRISE)
- createdAt: Timestamp
- emailVerified: Boolean

### AuditSessions Table
- id: UUID (primary key)
- userId: UUID (foreign key)
- url: String
- status: Enum (PENDING, RUNNING, COMPLETED, FAILED)
- results: JSON
- createdAt: Timestamp
- completedAt: Timestamp

## Configuration

### audits.yaml

Defines:
- Audit weights
- Scoring thresholds
- Industry detection rules
- Output formats

### models.yaml

Configures:
- LLM model settings
- Temperature and parameters
- Timeout values
- Retry logic

## Performance Characteristics

### Audit Timing
- URL fetch: 2-5 seconds
- Gatherers (parallel): 8-12 seconds
- Audits (sequential): 3-5 seconds
- LLM analysis: 8-15 seconds per failing audit
- **Total**: 15-25 seconds typical

### Resource Usage
- Backend: ~2GB RAM
- Ollama: ~5GB RAM (model loaded)
- PostgreSQL: ~100MB RAM
- Redis: ~50MB RAM
- Browser: ~500MB RAM per audit

### Concurrency
- Phase 1: 1-2 concurrent audits
- Phase 2: 5-10 with queue system
- Phase 3: 20+ with scaling

## Security Considerations

### Authentication
- JWT tokens with expiration
- bcrypt password hashing
- Rate limiting on auth endpoints

### Data Protection
- HTTPS in production
- SQL injection prevention (Prisma ORM)
- XSS prevention (React escaping)
- CSRF tokens on mutations

### Browser Isolation
- Sandboxed containers
- No persistent storage
- Isolated contexts
- Network restrictions

## Monitoring & Observability

### Logging
- Winston logger
- Structured JSON logs
- Log levels: error, warn, info, debug
- Request/response logging

### Metrics
- Audit duration
- Success/failure rates
- LLM response times
- Database query performance

## Deployment Architecture

### Docker Compose (Local)
- 5 containers: frontend, backend, postgres, redis, ollama
- Health checks on all services
- Volume mounts for hot reload
- Automatic migrations

### Production (Future)
- Kubernetes cluster
- Horizontal pod autoscaling
- Load balancer
- Managed database
- Redis cluster

## Design Decisions

### Why Qwen3 4B?
- Runs locally (no API costs)
- Good quality/speed tradeoff
- ARM-optimized
- Privacy-friendly

### Why Playwright?
- Modern browser automation
- Excellent JavaScript support
- Built-in network interception
- Better than Puppeteer for SSR detection

### Why PostgreSQL?
- JSONB for flexible audit storage
- ACID compliance
- Good performance
- Excellent tooling

### Why Redis?
- Fast job queue
- Pub/sub for progress updates
- Caching layer
- Mature ecosystem

## Future Enhancements

### Phase 2
- Multi-URL batch processing
- Historical trend analysis
- Email notifications
- API webhooks

### Phase 3
- Chrome extension
- CLI tool
- Multiple LLM providers
- Advanced caching

### Phase 4
- Team collaboration
- Custom audit rules
- White-label options
- Enterprise SSO

## Related Documentation

- [STREAMING_ARCHITECTURE.md](STREAMING_ARCHITECTURE.md): SSE implementation details
- [API.md](API.md): REST API reference
- [CONTRIBUTING.md](../CONTRIBUTING.md): Development guidelines
- [DEPLOYMENT.md](../DEPLOYMENT.md): Production deployment

## Questions?

- GitHub Issues for bugs
- GitHub Discussions for questions
- Architecture decisions: docs/ADR/ (future)
