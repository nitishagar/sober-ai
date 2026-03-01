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
- Node.js 22+
- Git
- [Ollama](https://ollama.com) (optional, for LLM recommendations)

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/sober-ai.git`
3. Add upstream remote: `git remote add upstream https://github.com/nitishagar/sober-ai.git`
4. Install dependencies:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   ```
5. Set up the database:
   ```bash
   npx prisma generate --schema=src/db/schema.prisma
   npx prisma migrate deploy --schema=src/db/schema.prisma
   ```
6. Start the development server: `npm run dev`
7. In a separate terminal, start the frontend: `cd frontend && npm run dev`
8. Access frontend at http://localhost:5173

### Project Structure

See docs/ARCHITECTURE.md for detailed system architecture.

Key directories:
- `src/core/` - Main audit orchestration
- `src/gatherers/` - Data collection modules
- `src/audits/` - Evaluation logic
- `src/llm/` - LLM integration and provider abstraction
- `src/api/` - Express.js API server and routes
- `src/db/` - Prisma schema and migrations
- `src/electron/` - Electron main process
- `frontend/` - React UI (Vite)
- `docs/` - Docsify documentation

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

Full verification (tests + lint):
```bash
npm run verify
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
4. Run verification: `npm run verify`
5. Commit with clear messages
6. Push to your fork
7. Open a pull request

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
- Environment (OS, Node version, app version)
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

### Database Changes

After modifying the Prisma schema:
```bash
npx prisma migrate dev --schema=src/db/schema.prisma
npx prisma generate --schema=src/db/schema.prisma
```

### Running the Electron App

```bash
# Build frontend first
cd frontend && npm run build && cd ..

# Launch Electron
npm run electron:dev
```

## Getting Help

- **GitHub Issues**: Bug reports and features
- **GitHub Discussions**: Questions and ideas
- **Documentation**: [nitishagar.github.io/sober-ai](https://nitishagar.github.io/sober-ai)

## Recognition

Contributors are recognized in:
- GitHub contributors page
- CHANGELOG.md for significant contributions

Thank you for contributing to SoberAI Optimizer!
