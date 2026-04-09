const request = require('supertest');
const app = require('../../src/api/server');
const { truncateAll, disconnect } = require('../helpers/db');
const ProviderFactory = require('../../src/llm/providers/ProviderFactory');
const OpenAIProvider = require('../../src/llm/providers/OpenAIProvider');
const OllamaProvider = require('../../src/llm/providers/OllamaProvider');
const { loadProviderSettings } = require('../../src/api/routes/settings');

describe('Settings → Provider Routing', () => {
  beforeEach(truncateAll);
  afterAll(disconnect);

  it('default settings (no DB rows) create ollama_local provider', async () => {
    const settings = await loadProviderSettings();
    expect(settings.provider).toBe('ollama_local');

    const provider = ProviderFactory.create(settings);
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama_local');
  });

  it('PUT llm_provider=openai + openai_api_key → ProviderFactory returns OpenAIProvider', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ llm_provider: 'openai', openai_api_key: 'test-key-abc123' });

    expect(res.status).toBe(200);
    expect(res.body.updated).toContain('llm_provider');
    expect(res.body.updated).toContain('openai_api_key');

    const settings = await loadProviderSettings();
    expect(settings.provider).toBe('openai');

    const provider = ProviderFactory.create(settings);
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.name).toBe('openai');
  });

  it('switching back to ollama_local after openai creates OllamaProvider', async () => {
    // First set to openai
    await request(app)
      .put('/api/settings')
      .send({ llm_provider: 'openai', openai_api_key: 'test-key-abc123' });

    // Then switch back to ollama_local
    const res = await request(app)
      .put('/api/settings')
      .send({ llm_provider: 'ollama_local' });

    expect(res.status).toBe(200);
    expect(res.body.updated).toContain('llm_provider');

    const settings = await loadProviderSettings();
    expect(settings.provider).toBe('ollama_local');

    const provider = ProviderFactory.create(settings);
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama_local');
  });

  it('PUT llm_provider=ollama_cloud + ollama_api_key creates OllamaProvider in cloud mode', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ llm_provider: 'ollama_cloud', ollama_api_key: 'cloud-key-xyz789' });

    expect(res.status).toBe(200);
    expect(res.body.updated).toContain('llm_provider');

    const settings = await loadProviderSettings();
    expect(settings.provider).toBe('ollama_cloud');

    const provider = ProviderFactory.create(settings);
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama_cloud');
  });

  it('GET /api/settings/providers lists all available provider types', async () => {
    const res = await request(app).get('/api/settings/providers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const ids = res.body.map(p => p.id);
    expect(ids).toContain('ollama_local');
    expect(ids).toContain('ollama_cloud');
    expect(ids).toContain('openai');
  });
});
