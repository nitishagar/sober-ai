# SoberAI Chrome extension (Manifest V3)

Tab audit via your SoberAI backend: open the popup on any page, run the
audit, watch SSE progress, and jump to the full report. No build step, no
remote code, no inline scripts.

## Pairing with the backend

1. Start the backend: `node src/api/server.js` (or the Electron app).
2. Load the extension: `chrome://extensions` → Developer mode →
   **Load unpacked** → select this `extension/` directory.
3. Open the popup on any `http(s)` page and click **Run Audit**.

Default backend is `http://localhost:3000` (covered by the bundled
`host_permissions`). For a self-hosted backend, set its URL in the
extension's Settings page and approve the one-time origin grant.

## Credentials (BYO only)

The API key lives in `chrome.storage.local` and rides each audit as
`X-LLM-*` headers — the same BYO contract as the web app (S9/S21). It is
never written to the server, URLs, or logs. **Clear key** removes it.

## CORS

Popup fetches carry no cookies. With default settings the backend's
wildcard CORS covers the extension. For a locked-down deploy, allowlist
the extension origin explicitly (S22):

```bash
CORS_ORIGIN=chrome-extension://<your-extension-id>
```

Find the id at `chrome://extensions` after loading unpacked.

## Files

- `manifest.json` — MV3, minimal permissions (`storage`, `activeTab`,
  localhost hosts; remote-backend origins are optional, per-origin grants)
- `popup.html` / `popup.js` / `popup.css` — audit flow
- `options.html` / `options.js` — backend + key settings
- `lib/audit.js` — pure helpers, unit-tested by
  `tests/unit/extension-audit.test.js`
- `icons/` — generated from `assets/brand/sober-ai-logo.svg`
  (`npm run brand:icons`; never hand-edit)
