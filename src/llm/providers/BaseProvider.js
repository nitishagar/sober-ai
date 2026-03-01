const logger = require('../../utils/logger');

class BaseProvider {
  constructor(config = {}) {
    this.model = config.model;
    this.temperature = config.temperature ?? 0.3;
    this.topP = config.top_p ?? 0.9;
    this.maxTokens = config.max_tokens ?? 2048;
    this.timeout = config.timeout ?? 60000;
  }

  /**
   * Generate a completion from the model.
   * @param {string} prompt - The prompt to send
   * @param {Function|null} onProgress - Optional streaming callback
   * @returns {Promise<string>} The model's response text
   */
  async generate(prompt, onProgress = null) {
    throw new Error('generate() must be implemented by provider subclass');
  }

  /**
   * Test the connection to the provider.
   * @returns {Promise<{ok: boolean, message: string, model?: string}>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by provider subclass');
  }

  /**
   * Get the provider name for display.
   * @returns {string}
   */
  get name() {
    return 'base';
  }
}

module.exports = BaseProvider;
