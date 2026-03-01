# Installation

## Desktop App (Recommended)

Download the latest release for your platform from the [Releases page](https://github.com/nitishagar/sober-ai/releases).

| Platform | Format |
|----------|--------|
| Linux | `.deb`, `.AppImage` |
| Windows | `.exe` (NSIS installer) |
| macOS | `.dmg` |

The desktop app bundles everything you need. Just install and run.

## From Source

### Prerequisites

- Node.js 22+
- npm 9+
- [Ollama](https://ollama.com) (for local AI recommendations)

### Steps

```bash
# Clone the repository
git clone https://github.com/nitishagar/sober-ai.git
cd sober-ai

# Install backend dependencies
npm install

# Install frontend dependencies and build
cd frontend && npm install && npm run build && cd ..

# Generate Prisma client
npx prisma generate --schema=src/db/schema.prisma

# Run database migration
npx prisma migrate deploy --schema=src/db/schema.prisma

# Start the server
node src/api/server.js
```

The app will be available at `http://localhost:3000`.

### Electron Development Mode

```bash
# Build the frontend first
cd frontend && npm run build && cd ..

# Launch Electron
npm run electron:dev
```

## Ollama Setup

SoberAI uses Ollama for local AI-powered recommendations. Install Ollama and pull the default model:

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull the default model
ollama pull qwen3:4b

# Verify it's running
ollama list
```

The default endpoint is `http://localhost:11434`. You can change this in Settings.

## Environment Variables

Create a `.env` file in the project root (optional):

```bash
# Server port (default: 3000)
PORT=3000

# SQLite database path (default: ./prisma/dev.db)
DATABASE_URL="file:./prisma/dev.db"

# Ollama endpoint (default: http://localhost:11434)
OLLAMA_ENDPOINT=http://localhost:11434

# OpenAI API key (optional, if using OpenAI provider)
OPENAI_API_KEY=
```
