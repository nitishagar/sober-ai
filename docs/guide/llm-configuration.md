# LLM Configuration

SoberAI supports multiple LLM providers for generating AI-powered audit recommendations. Configure your preferred provider in the **Settings** page.

## Providers

### OpenAI / OpenAI-compatible (Default)

Uses an OpenAI-compatible API key for recommendations — `api.openai.com`,
NVIDIA NIM (`https://integrate.api.nvidia.com/v1`), or any
`/chat/completions`-compatible base URL set as Endpoint. Requires an API key
(from [platform.openai.com](https://platform.openai.com/api-keys), or your
compatible provider). Without a key, audits complete with finding-based
fallback recommendations.

### Ollama Local

Runs a local LLM on your machine. Free, private, no API key required.

| Setting | Default |
|---------|---------|
| Endpoint | `http://localhost:11434` |
| Model | `qwen3:4b` |

**Setup:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model
ollama pull qwen3:4b

# Verify
ollama list
```

**Recommended models:**
- `qwen3:4b` - fast, good quality (2.5GB RAM)
- `qwen3:8b` - better quality, slower (5GB RAM)
- `llama3.2:3b` - alternative, fast (2GB RAM)

### Ollama Cloud

Use a remote Ollama instance with API key authentication.

| Setting | Description |
|---------|-------------|
| Endpoint | Your Ollama cloud server URL |
| API Key | Bearer token for authentication |
| Model | Model name available on the server |

### OpenAI settings reference

| Setting | Default |
|---------|---------|
| API Key | Required (from [platform.openai.com](https://platform.openai.com/api-keys)) |
| Endpoint | `https://api.openai.com/v1` (use `https://integrate.api.nvidia.com/v1` for NVIDIA NIM) |
| Model | `gpt-4o-mini` |

**Other supported models:** `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`

## Testing Your Connection

After configuring a provider, click **Test Connection** on the Settings page to verify:
- The endpoint is reachable
- The API key is valid (for cloud providers)
- The specified model is available

## How Providers Are Used

When you run an audit, the configured provider is used in Phase 4 (AI Recommendations). Each failing audit category gets its own LLM analysis call with a specialized prompt template.

If the provider is unavailable, SoberAI falls back to the baseline findings from the audit without LLM enhancement.

## Settings Storage

Provider settings are stored locally in the SQLite database. API keys are masked in the UI after saving and never transmitted outside the app except to the configured provider endpoint.
