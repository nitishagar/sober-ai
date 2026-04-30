const axios = require('axios');
const BaseProvider = require('../../../src/llm/providers/BaseProvider');
const OllamaProvider = require('../../../src/llm/providers/OllamaProvider');
const OpenAIProvider = require('../../../src/llm/providers/OpenAIProvider');
const AnthropicProvider = require('../../../src/llm/providers/AnthropicProvider');
const ProviderFactory = require('../../../src/llm/providers/ProviderFactory');

jest.mock('axios');

describe('BaseProvider', () => {
  it('sets default config values', () => {
    const provider = new BaseProvider();
    expect(provider.temperature).toBe(0.3);
    expect(provider.topP).toBe(0.9);
    expect(provider.maxTokens).toBe(2048);
    expect(provider.timeout).toBe(60000);
  });

  it('accepts custom config values', () => {
    const provider = new BaseProvider({
      model: 'test-model',
      temperature: 0.7,
      top_p: 0.5,
      max_tokens: 4096,
      timeout: 30000
    });
    expect(provider.model).toBe('test-model');
    expect(provider.temperature).toBe(0.7);
    expect(provider.topP).toBe(0.5);
    expect(provider.maxTokens).toBe(4096);
    expect(provider.timeout).toBe(30000);
  });

  it('throws on unimplemented generate()', async () => {
    const provider = new BaseProvider();
    await expect(provider.generate('test')).rejects.toThrow('must be implemented');
  });

  it('throws on unimplemented testConnection()', async () => {
    const provider = new BaseProvider();
    await expect(provider.testConnection()).rejects.toThrow('must be implemented');
  });
});

describe('OllamaProvider', () => {
  beforeEach(() => jest.resetAllMocks());

  it('defaults to local endpoint and qwen3:4b', () => {
    const provider = new OllamaProvider();
    expect(provider.endpoint).toBe('http://localhost:11434');
    expect(provider.model).toBe('qwen3:4b');
    expect(provider.name).toBe('ollama_local');
  });

  it('reports ollama_cloud when apiKey is set', () => {
    const provider = new OllamaProvider({
      endpoint: 'https://api.ollama.com',
      apiKey: 'test-key',
      model: 'qwen3:4b'
    });
    expect(provider.name).toBe('ollama_cloud');
  });

  it('generates non-streaming response', async () => {
    axios.post.mockResolvedValue({
      data: { response: '{"result": "ok"}' }
    });

    const provider = new OllamaProvider({ endpoint: 'http://localhost:11434' });
    const result = await provider.generate('test prompt');

    expect(result).toBe('{"result": "ok"}');
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        model: 'qwen3:4b',
        prompt: 'test prompt',
        stream: false
      }),
      expect.any(Object)
    );
  });

  it('includes auth header for cloud mode', async () => {
    axios.post.mockResolvedValue({
      data: { response: '{"result": "ok"}' }
    });

    const provider = new OllamaProvider({
      endpoint: 'https://api.ollama.com',
      apiKey: 'my-key'
    });
    await provider.generate('test');

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: { 'Authorization': 'Bearer my-key' }
      })
    );
  });

  it('tests connection successfully', async () => {
    axios.get.mockResolvedValue({
      data: {
        models: [{ name: 'qwen3:4b' }, { name: 'llama2:7b' }]
      }
    });

    const provider = new OllamaProvider();
    const result = await provider.testConnection();

    expect(result.ok).toBe(true);
    expect(result.message).toContain('qwen3:4b');
    expect(result.available).toContain('qwen3:4b');
  });

  it('reports connection failure', async () => {
    axios.get.mockRejectedValue(new Error('ECONNREFUSED'));

    const provider = new OllamaProvider();
    const result = await provider.testConnection();

    expect(result.ok).toBe(false);
    expect(result.message).toContain('ECONNREFUSED');
  });
});

describe('OpenAIProvider', () => {
  beforeEach(() => jest.resetAllMocks());

  it('requires an API key', () => {
    expect(() => new OpenAIProvider()).toThrow('API key is required');
  });

  it('defaults to gpt-4o-mini model', () => {
    const provider = new OpenAIProvider({ apiKey: 'test-key-openai' });
    expect(provider.model).toBe('gpt-4o-mini');
    expect(provider.endpoint).toBe('https://api.openai.com/v1');
    expect(provider.name).toBe('openai');
  });

  it('generates non-streaming response', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: '{"result": "ok"}' } }]
      }
    });

    const provider = new OpenAIProvider({ apiKey: 'test-key-openai' });
    const result = await provider.generate('test prompt');

    expect(result).toBe('{"result": "ok"}');
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'test prompt' })
        ]),
        stream: false
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key-openai'
        })
      })
    );
  });

  it('tests connection successfully', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4' }]
      }
    });

    const provider = new OpenAIProvider({ apiKey: 'test-key-openai' });
    const result = await provider.testConnection();

    expect(result.ok).toBe(true);
    expect(result.message).toContain('gpt-4o-mini');
  });

  it('reports invalid API key', async () => {
    const error = new Error('Unauthorized');
    error.response = { status: 401 };
    axios.get.mockRejectedValue(error);

    const provider = new OpenAIProvider({ apiKey: 'test-key-bad' });
    const result = await provider.testConnection();

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Invalid API key');
  });
});

describe('ProviderFactory', () => {
  it('creates ollama_local provider by default', () => {
    const provider = ProviderFactory.create();
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama_local');
  });

  it('creates ollama_cloud provider with apiKey', () => {
    const provider = ProviderFactory.create({
      provider: 'ollama_cloud',
      apiKey: 'test-key'
    });
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama_cloud');
  });

  it('creates openai provider', () => {
    const provider = ProviderFactory.create({
      provider: 'openai',
      apiKey: 'test-key-openai'
    });
    expect(provider).toBeInstanceOf(OpenAIProvider);
    expect(provider.name).toBe('openai');
  });

  it('creates anthropic provider', () => {
    const provider = ProviderFactory.create({
      provider: 'anthropic',
      apiKey: 'fake-test-key',
      model: 'claude-haiku-4-5-20251001'
    });
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.name).toBe('anthropic');
    expect(provider.model).toBe('claude-haiku-4-5-20251001');
  });

  it('falls back to ollama_local for unknown provider', () => {
    const provider = ProviderFactory.create({ provider: 'unknown' });
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama_local');
  });

  it('lists available providers', () => {
    const providers = ProviderFactory.listProviders();
    expect(providers).toHaveLength(4);
    expect(providers.map(p => p.id)).toEqual(['ollama_local', 'ollama_cloud', 'openai', 'anthropic']);
  });
});

describe('AnthropicProvider', () => {
  beforeEach(() => jest.resetAllMocks());

  it('requires an API key', () => {
    expect(() => new AnthropicProvider()).toThrow('API key is required');
  });

  it('defaults to claude-haiku-4-5-20251001', () => {
    const provider = new AnthropicProvider({ apiKey: 'fake-test-key' });
    expect(provider.model).toBe('claude-haiku-4-5-20251001');
    expect(provider.endpoint).toBe('https://api.anthropic.com/v1');
    expect(provider.name).toBe('anthropic');
  });

  it('generates non-streaming response', async () => {
    axios.post.mockResolvedValue({
      data: { content: [{ type: 'text', text: '{"result":"ok"}' }] }
    });
    const provider = new AnthropicProvider({ apiKey: 'fake-test-key' });
    const result = await provider.generate('test prompt');
    expect(result).toBe('{"result":"ok"}');
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: 'test prompt' }],
        stream: false
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'fake-test-key',
          'anthropic-version': '2023-06-01'
        })
      })
    );
  });

  it('reports invalid API key', async () => {
    const error = new Error('Unauthorized');
    error.response = { status: 401 };
    axios.post.mockRejectedValue(error);
    const provider = new AnthropicProvider({ apiKey: 'bad' });
    const result = await provider.testConnection();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Invalid API key');
  });
});
