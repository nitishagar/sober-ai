# Privacy Policy — SoberAI

Last updated: 2026-11-12

SoberAI is a free, open-source website auditor. This policy covers the
SoberAI Chrome extension and the SoberAI web app / backend.

## What the extension does with your data

- **API keys stay in your browser.** Keys you enter in the extension's
  Settings are stored only in `chrome.storage.local` on your device. They
  are sent per-audit to **your own configured SoberAI backend**
  (`http://localhost:3000` by default) as request headers, and are never
  saved server-side, written to URLs, or logged.
- **The audited page URL is sent to your backend** so it can fetch and
  analyze the page. That is the extension's core function.
- **No accounts, no analytics, no tracking.** The extension collects
  nothing about you, sets no cookies, and talks to no server except the
  backend URL you configure.

## What the self-hosted backend stores

If you run the SoberAI backend yourself (local app, server, or Electron),
audit reports (URL, scores, findings, recommendations) are stored in
**your own** local SQLite database so you can review and compare them.
Delete a report in the app to remove it. Nothing leaves your machine
unless you configure a cloud LLM provider (your key, your provider) or a
batch webhook URL (your endpoint).

## Data sharing

We share nothing with anyone: there is no SoberAI cloud service receiving
your data in the default setup. The software is open source — verify at
<https://github.com/nitishagar/sober-ai>.

## Contact

Email [hello@applair.in](mailto:hello@applair.in), or open an issue at
<https://github.com/nitishagar/sober-ai/issues>.
