const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const logger = require('../../utils/logger');

class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || 'https://api.anthropic.com/v1';
    this.model = config.model || 'claude-haiku-4-5-20251001';
    this.anthropicVersion = config.anthropicVersion || '2023-06-01';

    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
  }

  get name() {
    return 'anthropic';
  }

  _headers() {
    return {
      'x-api-key': this.apiKey,
      'anthropic-version': this.anthropicVersion,
      'Content-Type': 'application/json'
    };
  }

  async generate(prompt, onProgress = null) {
    const payload = {
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      top_p: this.topP,
      messages: [{ role: 'user', content: prompt }],
      stream: Boolean(onProgress)
    };

    if (!onProgress) {
      const response = await axios.post(
        `${this.endpoint}/messages`,
        payload,
        { timeout: this.timeout, headers: this._headers() }
      );
      const blocks = response.data.content || [];
      return blocks.map(b => b.text || '').join('');
    }

    const response = await axios.post(
      `${this.endpoint}/messages`,
      payload,
      { timeout: this.timeout, responseType: 'stream', headers: this._headers() }
    );

    return new Promise((resolve, reject) => {
      let aggregated = '';
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.substring(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            if (json.type === 'content_block_delta' && json.delta?.text) {
              aggregated += json.delta.text;
              onProgress(json.delta.text);
            }
          } catch (err) {
            logger.debug(`Anthropic streaming parse error: ${err.message}`);
          }
        }
      });
      response.data.on('error', reject);
      response.data.on('end', () => resolve(aggregated));
    });
  }

  async testConnection() {
    try {
      await axios.post(
        `${this.endpoint}/messages`,
        {
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'ping' }]
        },
        { timeout: 10000, headers: this._headers() }
      );
      return {
        ok: true,
        message: `Connected. Model ${this.model} responded.`,
        model: this.model
      };
    } catch (error) {
      const status = error.response?.status;
      const msg = status === 401
        ? 'Invalid API key'
        : status === 404
          ? `Model ${this.model} not found`
          : `Connection failed: ${error.message}`;
      return { ok: false, message: msg };
    }
  }
}

module.exports = AnthropicProvider;
