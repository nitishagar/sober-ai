# Contributing to SoberAI Optimizer

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Table of Contents
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Code Review Process](#code-review-process)

## Getting Started

### Prerequisites
- Node.js 20+
- Docker Desktop
- 8GB+ RAM available
- Git

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/sober-ai.git`
3. Add upstream remote: `git remote add upstream https://github.com/nitishagar/sober-ai.git`
4. Start local development: `npm run local:start`
5. Wait for all services to be healthy (2-3 min first run)
6. Access frontend at http://localhost:5173

### Project Structure

See docs/ARCHITECTURE.md for detailed system architecture.

Key directories:
- `src/core/` - Main audit orchestration
- `src/gatherers/` - Data collection modules
- `src/audits/` - Evaluation logic
- `src/llm/` - LLM integration
- `backend/` - API server and database
- `frontend/` - React UI
- `docker/` - Docker configuration

## Code Style

### JavaScript/Node.js

We use ESLint and Prettier for code formatting.

Run linting:
```bash
npm run lint
```

Auto-format code:
```bash
npm run format
```

### Style Guidelines
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions small and focused
- Prefer async/await over promises
- Handle errors explicitly

### Naming Conventions
- Files: kebab-case (`ssr-detection.js`)
- Functions: camelCase (`calculateScore`)
- Classes: PascalCase (`AuditOrchestrator`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)

## Testing Requirements

### Running Tests

All tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

With coverage:
```bash
npm test -- --coverage
```

### Test Coverage Requirements
- New features must include unit tests
- Aim for 80%+ coverage on new code
- Integration tests for API endpoints
- Test edge cases and error conditions

### Writing Tests

Use Jest for unit tests:

```javascript
describe('scorer', () => {
  test('calculates weighted average correctly', () => {
    const result = calculateWeightedScore(scores, weights);
    expect(result).toBe(85);
  });
});
```

## Pull Request Process

### Before Submitting

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Add tests for new functionality
4. Run linting: `npm run lint`
5. Run tests: `npm test`
6. Commit with clear messages
7. Push to your fork
8. Open a pull request

### PR Requirements

- Clear description of changes
- Link to related issue (if applicable)
- Tests pass in CI
- Code is linted and formatted
- Documentation updated (if needed)
- No merge conflicts

### Commit Message Format

Use conventional commits:

```
feat: add new audit for mobile optimization
fix: correct SSR detection for Next.js apps
docs: update API documentation
test: add tests for schema parser
refactor: simplify scoring algorithm
```

## Issue Guidelines

### Before Opening an Issue

1. Search existing issues
2. Check if it's already in the roadmap
3. Verify it's not in CHANGELOG

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node version, Docker version)
- Relevant logs

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative approaches considered
- Mockups or examples (if applicable)

## Code Review Process

### Review Timeline
- Maintainers review PRs within 2-3 business days
- Address feedback within 1 week
- Stale PRs (no activity for 2 weeks) may be closed

### Review Criteria
- Code quality and readability
- Test coverage
- Performance implications
- Security considerations
- Documentation completeness

## Development Workflow

### Daily Workflow

Start services:
```bash
npm run local:start
```

View logs:
```bash
npm run local:logs
```

Stop services:
```bash
npm run local:stop
```

### Hot Reload

Both frontend and backend support hot reload:
- Frontend: Vite HMR updates instantly
- Backend: Nodemon restarts on file changes

### Database Changes

After modifying schema:
```bash
npx prisma migrate dev --schema=backend/src/db/schema.prisma
npx prisma generate --schema=backend/src/db/schema.prisma
```

## Getting Help

- **GitHub Issues**: Bug reports and features
- **GitHub Discussions**: Questions and ideas
- **Documentation**: docs/ directory
- **Architecture**: docs/ARCHITECTURE.md
- **Streaming**: docs/STREAMING_ARCHITECTURE.md

## Recognition

Contributors are recognized in:
- GitHub contributors page
- CHANGELOG.md for significant contributions
- Social media announcements for major features

Thank you for contributing to SoberAI Optimizer!
