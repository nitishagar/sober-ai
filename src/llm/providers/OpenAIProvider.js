const axios = require('axios');
const BaseProvider = require('./BaseProvider');
const logger = require('../../utils/logger');

class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || 'https://api.openai.com/v1';
    this.model = config.model || 'gpt-4o-mini';

    if (!this.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  get name() {
    return 'openai';
  }

  async generate(prompt, onProgress = null) {
    const payload = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that analyzes websites and provides actionable optimization recommendations. Return only valid JSON.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: this.temperature,
      top_p: this.topP,
      max_tokens: this.maxTokens,
      stream: Boolean(onProgress)
    };

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    if (!onProgress) {
      const response = await axios.post(
        `${this.endpoint}/chat/completions`,
        payload,
        { timeout: this.timeout, headers }
      );
      return response.data.choices[0].message.content;
    }

    const response = await axios.post(
      `${this.endpoint}/chat/completions`,
      payload,
      { timeout: this.timeout, responseType: 'stream', headers }
    );

    return new Promise((resolve, reject) => {
      let aggregated = '';
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            if (data === '[DONE]') {
              resolve(aggregated);
              return;
            }
            try {
              const json = JSON.parse(data);
              const token = json.choices?.[0]?.delta?.content;
              if (token) {
                aggregated += token;
                onProgress(token);
              }
            } catch (parseError) {
              logger.debug(`OpenAI streaming parse error: ${parseError.message}`);
            }
          }
        }
      });

      response.data.on('error', reject);
      response.data.on('end', () => resolve(aggregated));
    });
  }

  async testConnection() {
    try {
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      };
      const response = await axios.get(
        `${this.endpoint}/models`,
        { timeout: 5000, headers }
      );
      const models = response.data.data || [];
      const hasModel = models.some(m => m.id === this.model);

      return {
        ok: true,
        message: hasModel
          ? `Connected. Model ${this.model} available.`
          : `Connected. Using model ${this.model}.`,
        model: this.model
      };
    } catch (error) {
      const msg = error.response?.status === 401
        ? 'Invalid API key'
        : `Connection failed: ${error.message}`;
      return {
        ok: false,
        message: msg
      };
    }
  }
}

module.exports = OpenAIProvider;
