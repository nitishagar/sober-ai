const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const logger = require('../../utils/logger');

class OllamaProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.endpoint = config.endpoint || 'http://localhost:11434';
    this.apiKey = config.apiKey || null;
    this.model = config.model || 'qwen3:4b';
  }

  get name() {
    return this.apiKey ? 'ollama_cloud' : 'ollama_local';
  }

  _getHeaders() {
    const headers = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  async generate(prompt, onProgress = null) {
    const payload = {
      model: this.model,
      prompt,
      stream: Boolean(onProgress),
      options: {
        temperature: this.temperature,
        top_p: this.topP,
        num_predict: this.maxTokens
      }
    };

    const headers = this._getHeaders();

    if (!onProgress) {
      const response = await axios.post(
        `${this.endpoint}/api/generate`,
        payload,
        { timeout: this.timeout, headers }
      );
      return response.data.response;
    }

    const response = await axios.post(
      `${this.endpoint}/api/generate`,
      payload,
      { timeout: this.timeout, responseType: 'stream', headers }
    );

    return new Promise((resolve, reject) => {
      let aggregated = '';
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              aggregated += json.response;
              onProgress(json.response);
            }
            if (json.done) {
              resolve(aggregated);
            }
          } catch (parseError) {
            logger.debug(`Streaming parse error: ${parseError.message}`);
          }
        }
      });

      response.data.on('error', reject);
      response.data.on('end', () => resolve(aggregated));
    });
  }

  async testConnection() {
    try {
      const headers = this._getHeaders();
      const response = await axios.get(
        `${this.endpoint}/api/tags`,
        { timeout: 5000, headers }
      );
      const models = response.data.models || [];
      const hasModel = models.some(m => m.name === this.model);

      return {
        ok: true,
        message: hasModel
          ? `Connected. Model ${this.model} available.`
          : `Connected but model ${this.model} not found. Available: ${models.map(m => m.name).join(', ')}`,
        model: this.model,
        available: models.map(m => m.name)
      };
    } catch (error) {
      return {
        ok: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }
}

module.exports = OllamaProvider;
