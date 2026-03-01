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

Query parameters: `page`, `limit`, `search`

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
  "openai_api_key": "",
  "openai_model": "gpt-4o-mini"
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
  { "id": "openai", "name": "OpenAI", "requiresApiKey": true }
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

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

Common status codes: `400` (bad request), `404` (not found), `500` (server error).
