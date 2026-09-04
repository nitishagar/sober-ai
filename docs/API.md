# API Reference

Version: 0.3.0
Base URL: `http://localhost:3000`

## Audit Endpoints

### Start Audit with Progress

**POST** `/api/audit-progress`

Starts an audit and streams real-time progress via Server-Sent Events (SSE).

```bash
curl -X POST http://localhost:3000/api/audit-progress \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Response: `text/event-stream`

```
data: {"status":"started","sessionId":"audit-1234","message":"Initializing audit...","progress":0}

data: {"status":"processing","phase":1,"message":"Analyzing server-side rendering...","progress":15,"eta":25}

data: {"status":"processing","phase":4,"message":"Analyzing SSR Readiness...","progress":60,"eta":12}

data: {"status":"completed","message":"Audit complete!","progress":100,"reportId":"clx...","result":{...}}
```

### Reconnect to Session

**GET** `/api/audit-progress/session/:sessionId/stream`

Reconnects to an in-progress or completed audit session.

### Get Session Status

**GET** `/api/audit-progress/session/:sessionId`

Returns current session state for UI restoration.

```json
{
  "status": "processing",
  "url": "https://example.com",
  "phase": 2,
  "progress": 35,
  "message": "Running audits..."
}
```

## Report Endpoints

### List Reports

**GET** `/api/reports`

Query parameters: `page` (default `1`), `limit` (default `20`), `search`
(substring match on URL), `sortBy`, `sortOrder`.

`sortBy` allowlist: `createdAt`, `overallScore`, `url`, `grade`
(default `createdAt`). `sortOrder`: `asc` / `desc`, case-insensitive
(default `desc`). Unknown `sortBy`/`sortOrder` values fall back to the
defaults — the endpoint never rejects them with `400`.

Each list item carries all 5 category scores (`ssrScore`, `schemaScore`,
`semanticScore`, `contentScore`, `machineReadabilityScore`).

```json
{
  "reports": [
    {
      "id": "clx...",
      "url": "https://example.com",
      "overallScore": 85,
      "grade": "B",
      "ssrScore": 90,
      "schemaScore": 75,
      "semanticScore": 88,
      "contentScore": 82,
      "machineReadabilityScore": 79,
      "createdAt": "2026-03-01T..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "pages": 1
  }
}
```

### Get Report

**GET** `/api/reports/:reportId`

Returns full report with parsed audit results and recommendations.

### Delete Report

**DELETE** `/api/reports/:reportId`

### Get Report Stats

**GET** `/api/reports/stats`

Returns aggregate statistics across all reports.

### Compare Reports

**GET** `/api/reports/compare/:id1/:id2`

Returns side-by-side comparison of two reports.

## Batch Endpoints (curl-driven, no UI)

### Submit Batch Job

**POST** `/api/batch` → `202 Accepted`

Submits up to 100 URLs for sequential background auditing. There is no UI
for batch jobs — submit and poll via curl.

```bash
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://a.example.com", "https://b.example.com"], "webhook": "https://hooks.example.com/done"}'
```

`urls` (required): array of 1–100 URLs. `webhook` (optional): URL receiving
a single POST when the job reaches a terminal state.

Response (`202`):

```json
{
  "jobId": "550e8400-...",
  "status": "queued",
  "totalUrls": 2,
  "message": "Batch job queued. Check status at /api/status/:jobId",
  "statusUrl": "/api/status/550e8400-..."
}
```

Lifecycle: `queued` → `processing` → `completed` (all URLs succeeded) |
`failed` (none succeeded) | `partial` (mixed). Poll `statusUrl` until the
status is terminal.

Per-URL SSRF guard: a URL resolving to a private/loopback/link-local target
is recorded as `{ "url": ..., "status": "blocked", "error": "Blocked: ..." }`
without launching an audit; the drain continues with the next URL.

Owner scoping: the job is stored with the request's owner token. A job stored
with a token is visible only to that owner. A null owner (isolation inactive,
local/desktop mode) places the job in a single global namespace visible to
all callers.

Webhook: best-effort delivery on terminal state only — a single POST of
`{ jobId, status, totalUrls, completedUrls, results }` with a 5s timeout.
Delivery failures are logged and recorded, never fail the job. Reflected in
`webhookStatus`: `pending` → `delivered` | `failed` (`skipped` when no
webhook was supplied, or the webhook target is private).

Jobs live in an in-memory, single-process store and are lost on
restart/redeploy.

Rate limit: subject to the shared write-POST limiter (30/min per IP, see
Rate Limiting below).

### Get Batch Job Status

**GET** `/api/status/:jobId`

```bash
curl http://localhost:3000/api/status/550e8400-...
```

```json
{
  "jobId": "550e8400-...",
  "status": "processing",
  "totalUrls": 2,
  "completedUrls": 1,
  "results": [
    { "url": "https://a.example.com", "status": "completed", "reportId": "clx...", "overallScore": 80, "grade": "B" }
  ],
  "createdAt": "2026-03-01T...",
  "completedAt": null,
  "webhookStatus": "pending"
}
```

Unknown job id — and a job owned by a different owner token — both return
`404 { "error": "Job not found", "message": "No batch job found with id ..." }`
(no existence leak across owners).

## Legacy Endpoints (DEPRECATED)

> **DEPRECATED — back-compat only.** `POST /api/audit`, `GET /api/audit/:id`
> and `GET /api/report/:id` predate the SSE audit flow and the reports API.
> They remain for backward compatibility; removal is deferred post-1.0. New
> clients should use `POST /api/audit-progress` and `/api/reports` instead.

### Legacy: Run Audit (DEPRECATED)

**POST** `/api/audit` *(deprecated, see above)*

Runs a single-URL audit synchronously and returns the result with an id.

### Legacy: Get Audit Result (DEPRECATED)

**GET** `/api/audit/:id` *(deprecated, see above)*

Returns the stored in-memory audit result, or
`404 { "error": "Not Found", "message": "Audit result with ID <id> not found" }`.

### Legacy: Get Report Redirect (DEPRECATED)

**GET** `/api/report/:id` *(deprecated, see above)*

Redirects to `/api/audit/:id` (Phase 1 behavior).

## Settings Endpoints

### Get Settings

**GET** `/api/settings`

Returns all settings with API keys masked.

```json
{
  "llm_provider": "ollama_local",
  "ollama_endpoint": "http://localhost:11434",
  "ollama_model": "qwen3:4b",
  "ollama_api_key": "",
  "openai_endpoint": "",
  "openai_api_key": "",
  "openai_model": "gpt-4o-mini",
  "anthropic_api_key": "",
  "anthropic_model": "claude-haiku-4-5-20251001"
}
```

### Update Settings

**PUT** `/api/settings`

```json
{
  "llm_provider": "openai",
  "openai_model": "gpt-4o-mini"
}
```

### Test LLM Connection

**POST** `/api/settings/test-connection`

Tests the currently configured LLM provider.

```json
{
  "ok": true,
  "message": "Connected. Model qwen3:4b available.",
  "model": "qwen3:4b"
}
```

### List Providers

**GET** `/api/settings/providers`

```json
[
  { "id": "ollama_local", "name": "Ollama (Local)", "requiresApiKey": false },
  { "id": "ollama_cloud", "name": "Ollama (Cloud)", "requiresApiKey": true },
  { "id": "openai", "name": "OpenAI", "requiresApiKey": true },
  { "id": "anthropic", "name": "Anthropic (Claude)", "requiresApiKey": true }
]
```

## Health Check

**GET** `/api/health`

```json
{
  "status": "ok",
  "timestamp": "2026-03-01T...",
  "version": "0.3.0",
  "services": {
    "database": "connected",
    "ollama": "connected"
  }
}
```

## Error Responses

Error shapes are frozen per route — there is no single global shape. The
variants, exactly as returned:

- Validation, `POST /api/audit-progress`: `400 { "error": "<details>" }`
  (validator messages joined with `"; "`).
- Validation, `POST /api/audit` and `POST /api/batch`:
  `400 { "error": "Validation Error", "errors": ["..."] }`.
- SSRF block, `POST /api/audit-progress` and `POST /api/audit`:
  `400 { "error": "Blocked: <reason>" }`.
- Rate limited, write POSTs (`/api/audit-progress`, `/api/audit`, `/api/batch`):
  `429 { "error": "Too many audit requests, please slow down." }`.
- Unknown/expired audit session: `404 { "error": "Session not found or expired" }`.
- Unknown report / compare miss / delete miss:
  `404 { "error": "Report not found" }`,
  `404 { "error": "One or both reports not found" }`.
- Unknown batch job (or cross-owner): `404 { "error": "Job not found", "message": "No batch job found with id <jobId>" }`.
- Legacy audit miss: `404 { "error": "Not Found", "message": "Audit result with ID <id> not found" }`.
- Report list/stats failures: `500 { "error": "Failed to list reports" }` /
  `500 { "error": "Failed to get stats" }`.
- Batch creation failure: `500 { "error": "Internal Server Error", "message": "Failed to create batch job" }`.
- Unknown `/api/*` path: `404 { "error": "API endpoint not found" }`.

## Rate Limiting

Write POSTs — `POST /api/audit-progress`, `POST /api/audit`, `POST /api/batch` —
share one per-IP limiter: **30 requests/min** (tunable via `AUDIT_RATE_LIMIT`).
The budget is global across the three routes, not per-route. Excess requests
receive `429 { "error": "Too many audit requests, please slow down." }`.
