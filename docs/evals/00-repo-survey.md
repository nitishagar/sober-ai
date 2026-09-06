# Repo survey for AI evals — sober-ai (Prompt 3 Step 0)

Surveyed 2026-09-06 at commit c592416 (branch main → trial branch `evals/trial-promptfoo`). Full evidence ledger: `~/Documents/personal-development/thoughts/shared/research/2026-09-06-ai-eval-frameworks-two-repos.md`.

## Language, package manager, runtime, test runner
- Plain JavaScript (CommonJS) on Node ≥22 (`package.json` engines), npm, Express 4, Prisma 6 (sqlite), Playwright 1.63, Electron shell.
- Test runner: jest with two projects — `unit` (`tests/unit/**/*.test.js`) and `integration` (`tests/integration/**/*.test.js`, `globalSetup`/`globalTeardown`) — `jest.config.js:1-25`. Scripts: `test` = `jest --passWithNoTests`; `test:ci` adds `--forceExit --runInBand`. e2e: Playwright (`test:e2e`).
- Lint: eslint `src/`. CI: test job (node 22, `npm ci`, `prisma generate`, `npm run test:ci`, lint, frontend build) + separate e2e job — `.github/workflows/ci.yml:10-52`.

## Where the LLM surface lives
- `src/llm/providers/ProviderFactory.js:17-58` — `create(settings)` → Ollama (local/cloud), OpenAI, Anthropic; env fallbacks `OLLAMA_ENDPOINT`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.
- `src/llm/analyzer.js:104-109` — `LLMAnalyzer.analyze(auditResult, promptKey)` → `populateTemplate` → `provider.generate(prompt)`. Prompts from `src/llm/prompts/*.txt`; `populateTemplate` inserts only score/severity/displayValue/findings/details (`analyzer.js:125-146` — no URL placeholder).
- Response contract (`analyzer.js:73-102` `loadSchemaValidators`): **`recommendations` mandatory non-empty array with `priority,title,impact,effort,description` per item (throws otherwise); `summary`/`references` lenient** (default `''`/`[]`). LLM failures fall back, never throw (`analyzer.js:119-122,260-283`); analyzer-tier failures flagged `fallback:true`, auditor-tier failures surface `{error,message}` without a flag (prior spec S5 — the two tiers must be asserted separately).
- JSON extraction + `repairJson` fallback (`analyzer.js:180-214`) accepts lenient JSON (unquoted keys) — a boundary worth pinning.

## Where audits run and what leaves the system
- `src/core/auditor.js:64` `audit(url, progressHandlers)` → Playwright chromium `page.goto(url, {waitUntil:'networkidle', timeout:30000})` (`auditor.js:109-124`, ~15-20 s/audit) → 5 category audits (`auditor.js:154-170`) → `scorer.calculate()` (`src/core/scorer.js:21-66`) → `{overall, grade(A–F), categories:{<name>:{score,weight,weightedScore,severity}}}` → optional LLM recommendations (only for non-pass audits, `auditor.js:172-176`).
- API entry: `src/api/server.js` exports `app` (`:168`), listens only under `require.main===module` (`:142`), dotenv at `:1` does not override pre-set env. Routes: `POST /api/audit` (`src/api/routes/audit.js:15`) sync `{url,options}` → `{id,url,timestamp,duration,scores,auditResults,recommendations,metadata}`; `POST /api/audit-progress` SSE (`audit-progress.js:146`); `POST /api/batch` (async 202 + poll; per-url `status:'blocked'|'failed'|…` — `batch.js:94-124`); `GET /api/health` → `{status,version,services:{database,ollama}}` (`server.js:98-109`).
- Guards: all three write POSTs enforce SSRF `isPrivateTarget` (400 on private resolved IP; DNS-failure passes; `SSRF_BLOCK_PRIVATE=0` bypass — `audit.js:30-34`, `audit-progress.js:158-166`, `batch.js:94-105`) + shared `auditLimiter` 30/min (`AUDIT_RATE_LIMIT` env, module-load read — `rate-limit.js:8-10`).

## What must be faked to run offline
- **LLM**: existing pattern = HTTP stub on a local port (`tests/integration/globalSetup.js:29-43` — fixed plain-text `/api/generate|chat`). For the JSON contract path an eval-owned dual stub is required (the existing stub cannot emit valid recommendations). A URL marker CANNOT reach the prompt (`populateTemplate` has no URL placeholder) — stub behavior must be selected per app boot (two stub endpoints).
- **Target websites**: Playwright fetches the URL under audit — an eval-owned loopback canned-HTML server + `SSRF_BLOCK_PRIVATE=0` (documented env gate) makes audits offline.
- **DB**: `globalSetup` pattern — tmp sqlite `DATABASE_URL` + `prisma migrate deploy` (tableless DB 500s report-persisting paths).

## Existing test structure
- Unit tests mock seams with `jest.mock('axios'|'@prisma/client'|'playwright'|'dns')`. Integration: globalSetup stub on 11435 + tmp DB. In-repo prior specs: `thoughts/shared/plans/2026-09-04-*/IMPLICIT_SPEC.md` (S5 tier split; S9 BYO `X-LLM-*` headers; S11 SSRF — now stale, all three routes enforce; S12 limiter incl. batch; **S19: no `Co-authored-by` trailers**).

## Eval-suite constraints derived
- Eval files must live outside `tests/**` (jest testMatch) — `evals/`; new infra files only, no modification of existing test files; reuse `globalSetup` by import for DB/env.
- Per-app env overlays force one child process per app (`rate-limit.js` reads `AUDIT_RATE_LIMIT` at module load; `ssrf.js` per request).
- Teardown: `routes/audit-progress.js:24` module-level `setInterval` is un-clearable → runner must `process.exit()` after flush.
- Commits: no `Co-authored-by` (S19 + lumen-style identity hygiene).
