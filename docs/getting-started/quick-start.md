# Quick Start

Run your first AI-readiness audit in under 2 minutes.

## 1. Start SoberAI

Launch the desktop app or start the server:

```bash
node src/api/server.js
```

## 2. Run an Audit

1. Navigate to the **Audit** page
2. Enter a URL (e.g., `https://vercel.com`)
3. Click **Run Audit**
4. Watch real-time progress as SoberAI:
   - Gathers website data via Playwright
   - Runs 4 audit categories
   - Calculates weighted scores
   - Generates AI recommendations

## 3. Review Results

The report shows:

- **Overall Score** (0-100) with letter grade (A-F)
- **Category Scores** for SSR, Schema, Semantic, and Content
- **AI Recommendations** with priority, impact, and effort ratings
- **Code Examples** showing exactly what to change

## 4. Configure LLM (Optional)

Go to **Settings** to configure your AI provider:

- **Ollama Local** (default) - free, runs on your machine
- **Ollama Cloud** - remote Ollama with API key
- **OpenAI** - uses GPT-4o-mini for recommendations

Use the **Test Connection** button to verify your setup.

## Next Steps

- [Running Audits](guide/running-audits.md) - detailed audit guide
- [LLM Configuration](guide/llm-configuration.md) - provider setup
- [Understanding Results](guide/understanding-results.md) - what scores mean
