# Contributing

We welcome contributions to SoberAI! Here's how to get set up for development.

## Development Setup

```bash
# Clone and install
git clone https://github.com/nitishagar/sober-ai.git
cd sober-ai
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Generate Prisma client
npx prisma generate --schema=src/db/schema.prisma

# Run database migration
npx prisma migrate deploy --schema=src/db/schema.prisma

# Start backend (with hot reload via nodemon if installed)
node src/api/server.js

# In another terminal, start frontend dev server
cd frontend && npm run dev
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npx jest --watch
```

## Project Structure

```
sober-ai/
├── src/
│   ├── api/          # Express routes and middleware
│   ├── audits/       # Audit scoring modules
│   ├── config/       # YAML configuration
│   ├── core/         # Auditor orchestrator and scorer
│   ├── db/           # Prisma schema and migrations
│   ├── electron/     # Electron main process
│   ├── gatherers/    # Data collection modules
│   ├── llm/          # LLM analyzer and providers
│   ├── services/     # Business logic (reports)
│   └── utils/        # Logger, helpers
├── frontend/
│   └── src/          # React application
├── tests/
│   └── unit/         # Jest unit tests
└── docs/             # Docsify documentation
```

## Guidelines

- Write tests for new features
- Run `npm test` before submitting PRs
- Follow existing code patterns and naming conventions
- Keep PRs focused on a single change

## Reporting Issues

Use [GitHub Issues](https://github.com/nitishagar/sober-ai/issues) with the provided templates for bug reports and feature requests.
