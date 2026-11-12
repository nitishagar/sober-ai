const OllamaProvider = require('./OllamaProvider');
const OpenAIProvider = require('./OpenAIProvider');
const AnthropicProvider = require('./AnthropicProvider');
const logger = require('../../utils/logger');

class ProviderFactory {
  /**
   * Create a provider based on settings.
   * @param {Object} settings - Provider settings
   * @param {string} settings.provider - 'openai' (default), 'ollama_local', 'ollama_cloud', or 'anthropic'
   * @param {string} [settings.endpoint] - Provider endpoint URL
   * @param {string} [settings.apiKey] - API key (for cloud providers)
   * @param {string} [settings.model] - Model name
   * @param {Object} [settings.options] - Additional options (temperature, top_p, etc.)
   * @returns {BaseProvider}
   */
  static create(settings = {}) {
    // S20: the OpenAI-compatible key path is the default for all AI functionality.
    const provider = settings.provider || 'openai';

    switch (provider) {
      case 'ollama_local':
        return new OllamaProvider({
          endpoint: settings.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
          model: settings.model || 'qwen3:4b',
          ...settings.options
        });

      case 'ollama_cloud':
        return new OllamaProvider({
          endpoint: settings.endpoint || 'https://api.ollama.com',
          apiKey: settings.apiKey,
          model: settings.model || 'qwen3:4b',
          ...settings.options
        });

      case 'openai':
        return new OpenAIProvider({
          apiKey: settings.apiKey || process.env.OPENAI_API_KEY,
          endpoint: settings.endpoint,
          model: settings.model || 'gpt-4o-mini',
          ...settings.options
        });

      case 'anthropic':
        return new AnthropicProvider({
          apiKey: settings.apiKey || process.env.ANTHROPIC_API_KEY,
          endpoint: settings.endpoint,
          model: settings.model || 'claude-haiku-4-5-20251001',
          ...settings.options
        });

      default:
        logger.warn(`Unknown provider '${provider}', falling back to openai`);
        return new OpenAIProvider({
          apiKey: settings.apiKey || process.env.OPENAI_API_KEY,
          endpoint: settings.endpoint || process.env.OPENAI_ENDPOINT,
          model: settings.model || 'gpt-4o-mini',
          ...settings.options
        });
    }
  }

  /**
   * List available provider types.
   * @returns {Array<{id: string, name: string, requiresApiKey: boolean}>}
   */
  static listProviders() {
    return [
      { id: 'ollama_local', name: 'Ollama (Local)', requiresApiKey: false },
      { id: 'ollama_cloud', name: 'Ollama (Cloud)', requiresApiKey: true },
      { id: 'openai', name: 'OpenAI', requiresApiKey: true },
      { id: 'anthropic', name: 'Anthropic (Claude)', requiresApiKey: true }
    ];
  }
}

module.exports = ProviderFactory;
