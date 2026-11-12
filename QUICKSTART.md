# Quick Start Guide - SoberAI Optimizer

Get up and running in 5 minutes. SoberAI is local-first: the backend, SQLite
database, and web UI run on your machine with zero config.

## Prerequisites

```bash
node --version   # need >= 22.0.0
```

Playwright downloads its own Chromium on first use (`npx playwright install
chromium` if an audit ever reports a missing browser).

## 1. Install (1 minute)

```bash
git clone https://github.com/nitishagar/sober-ai.git
cd sober-ai
npm install
cd frontend && npm install && npm run build && cd ..
```

## 2. Set up the database (10 seconds)

```bash
npx prisma generate --schema=src/db/schema.prisma
npx prisma migrate deploy --schema=src/db/schema.prisma
```

## 3. Add an AI key (optional, recommended)

AI recommendations default to an OpenAI-compatible key. Without one, audits
still complete with finding-based recommendations.

```bash
# Option A: environment (used when no key is stored in Settings)
export OPENAI_API_KEY=sk-...

# Option B: Settings page in the app (server-stored), or
# Option C: Bring-Your-Own-Key mode (browser session only, never saved server-side)
```

Any `/chat/completions`-compatible base URL works (OpenAI, NVIDIA NIM via
`https://integrate.api.nvidia.com/v1`, self-hosted gateways) — set it as the
Endpoint next to the key. Prefer fully local? Switch the provider to
`ollama_local` in Settings and run `ollama pull qwen3:4b`.

## 4. Start (5 seconds)

```bash
node src/api/server.js
# Open http://localhost:3000/app
```

Or the desktop shell: `npm run electron:dev`.

## 5. Run your first audit

1. Open the **Audit** page, enter `https://example.com`, click **Run Audit**.
2. Watch SSE progress (it reconnects if the stream drops), then review the
   5 category scores, findings, and AI recommendations on the report page.
3. Compare two reports from **Reports** (select two → Compare).

**API equivalent:**

```bash
curl -N -X POST http://localhost:3000/api/audit-progress \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

**Batch (curl-driven, no UI):** `POST /api/batch` with up to 100 URLs, then
poll the returned `statusUrl` until terminal. See `docs/API.md`.

## 6. Chrome extension (optional)

1. Start the backend (step 4).
2. `chrome://extensions` → Developer mode → **Load unpacked** → `extension/`.
3. Click the SoberAI icon on any page → **Run Audit**. Add your key in the
   extension's Settings page (kept in `chrome.storage.local` only).

## Troubleshooting

### "AI recommendations need an API key" banner

Expected without a key: scores and findings still work; recommendations are
finding-based. Add a key (step 3) to clear it.

### "Cannot connect" / port in use

```bash
PORT=3001 node src/api/server.js   # use another port
curl http://localhost:3001/api/health
```

### Prisma errors (`@prisma/client did not initialize`)

Re-run step 2 (`prisma generate` + `migrate deploy`) with `DATABASE_URL` set
if you moved the DB file.

### Tests

```bash
npm run verify        # jest (unit + integration) + eslint
npm run test:e2e      # Playwright (installs Chromium first run)
npm run test:evals:vitest   # evalite offline gate
```

## Next steps

- Full command/endpoint reference: `docs/API.md`
- LLM providers + NVIDIA NIM: Settings page or `docs/guide/llm-configuration.md`
- Category weights: `src/config/audits.yaml`
- Model profiles: `src/config/models.yaml`
