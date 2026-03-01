const axios = require('axios');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const logger = require('../utils/logger');
const { sanitizeForJson, ensureArray } = require('./utils/llm-helpers');

class LLMAnalyzer {
  constructor(configPath = null) {
    const defaultConfigPath = path.join(__dirname, '../config/models.yaml');
    const resolvedPath = configPath || defaultConfigPath;

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`LLM model config not found at ${resolvedPath}`);
    }

    this.config = yaml.load(fs.readFileSync(resolvedPath, 'utf8'));
    const defaultProfileKey = this.config.models?.default;
    if (!defaultProfileKey) {
      throw new Error('LLM configuration missing models.default');
    }

    const profile = this.config.models.profiles?.[defaultProfileKey];
    if (!profile) {
      throw new Error(`LLM profile not found for key: ${defaultProfileKey}`);
    }

    const envEndpoint = process.env.OLLAMA_ENDPOINT;
    this.endpoint = envEndpoint || profile.endpoint;
    this.model = profile.model;
    this.temperature = profile.temperature ?? 0.3;
    this.topP = profile.top_p ?? 0.9;
    this.maxTokens = profile.max_tokens ?? 2048;

    if (!this.endpoint) {
      throw new Error('LLM endpoint not configured');
    }

    if (this.model !== 'qwen3:4b') {
      throw new Error(`Unsupported LLM model configured: ${this.model}. Expected qwen3:4b.`);
    }

    this.prompts = this.loadPromptTemplates();
    this.schemaValidators = this.loadSchemaValidators();
    logger.info(`LLMAnalyzer ready using model ${this.model} at ${this.endpoint}`);
  }

  loadPromptTemplates() {
    const promptDir = path.join(__dirname, 'prompts');
    const promptFiles = {
      ssr_analysis: 'ssr-analysis.txt',
      schema_recommendations: 'schema-recommendations.txt',
      semantic_improvements: 'semantic-improvements.txt',
      content_optimization: 'content-optimization.txt'
    };

    const prompts = {};
    for (const [key, filename] of Object.entries(promptFiles)) {
      const filePath = path.join(promptDir, filename);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        prompts[key] = content;
      } catch (error) {
        logger.error(`Failed to load prompt template ${filename}: ${error.message}`);
        prompts[key] = this.buildFallbackTemplate(key);
      }
    }
    return prompts;
  }

  loadSchemaValidators() {
    return {
      recommendations: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          throw new Error('recommendations array must contain at least one item');
        }

        return value.map((rec, index) => {
          const requiredFields = ['priority', 'title', 'impact', 'effort', 'description'];
          for (const field of requiredFields) {
            if (!rec[field]) {
              throw new Error(`recommendations[${index}].${field} is required`);
            }
          }
          return {
            priority: Number(rec.priority) || index + 1,
            title: String(rec.title).trim(),
            impact: String(rec.impact).trim(),
            effort: String(rec.effort).trim(),
            description: String(rec.description).trim(),
            why_it_matters: rec.why_it_matters ? String(rec.why_it_matters).trim() : undefined,
            code_example: rec.code_example ? String(rec.code_example).trim() : undefined
          };
        });
      },
      summary: (value) => String(value || '').trim(),
      references: (value) => ensureArray(value).map((ref) => String(ref).trim()).filter(Boolean)
    };
  }

  async analyze(auditResult, promptKey, onProgress = null) {
    const prompt = this.prompts[promptKey] || this.buildFallbackTemplate(promptKey);
    const populatedPrompt = this.populateTemplate(prompt, auditResult);

    try {
      const rawResponse = await this.callModel(populatedPrompt, onProgress);
      const parsed = this.parseResponse(rawResponse);
      const validated = this.validateStructuredResponse(parsed, auditResult);
      const comparison = this.compareWithBaseline(auditResult, validated);

      return {
        ...validated,
        comparison,
        raw: rawResponse
      };
    } catch (error) {
      logger.error(`LLM analysis failed (${promptKey}): ${error.message}`);
      return this.buildFallbackResponse(auditResult, promptKey, error);
    }
  }

  populateTemplate(template, auditResult) {
    const insertionValues = {
      score: auditResult.score,
      severity: auditResult.severity,
      display_value: auditResult.displayValue,
      findings: auditResult.findings,
      details: auditResult.details || {}
    };

    let output = template;
    const flatDetails = this.flattenDetails(insertionValues.details);

    for (const [key, value] of Object.entries({
      ...flatDetails,
      score: insertionValues.score,
      severity: insertionValues.severity,
      display_value: insertionValues.display_value
    })) {
      const placeholder = new RegExp(`\\{${key}\\}`, 'g');
      output = output.replace(placeholder, sanitizeForJson(value));
    }

    if (Array.isArray(insertionValues.findings) && insertionValues.findings.length) {
      output += '\n\nFindings Summary:\n';
      insertionValues.findings.forEach((finding, index) => {
        output += `${index + 1}. [${finding.type}] ${finding.title} — ${finding.message}`;
        if (finding.recommendation) {
          output += `\n   Recommendation: ${finding.recommendation}`;
        }
        output += '\n';
      });
    }

    output += '\nReturn ONLY valid JSON following the required schema. No Markdown. No commentary.';
    return output;
  }

  flattenDetails(details = {}) {
    const result = {};

    const walk = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const nextKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          walk(value, nextKey);
        } else {
          result[nextKey.replace(/\.|-/g, '_')] = value;
        }
      }
    };

    walk(details);
    return result;
  }

  async callModel(prompt, onProgress) {
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

    if (!onProgress) {
      const response = await axios.post(`${this.endpoint}/api/generate`, payload, { timeout: 60000 });
      return response.data.response;
    }

    const response = await axios.post(`${this.endpoint}/api/generate`, payload, {
      timeout: 60000,
      responseType: 'stream'
    });

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

  parseResponse(rawText) {
    if (!rawText) {
      throw new Error('Empty model response');
    }

    const trimmed = rawText.trim();
    const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i) || trimmed.match(/\{[\s\S]*\}/);

    let structuredText = trimmed;
    if (jsonMatch) {
      structuredText = jsonMatch[1] || jsonMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(structuredText);
    } catch (error) {
      logger.warn('Model returned malformed JSON, attempting repair');
      const repaired = this.repairJson(structuredText);
      parsed = JSON.parse(repaired);
    }

    return parsed;
  }

  repairJson(text) {
    let repaired = text.replace(/,\s*(\}|\])/g, '$1');
    repaired = repaired.replace(/(\{|,)\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
    const firstBrace = repaired.indexOf('{');
    const lastBrace = repaired.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('Unable to locate JSON object in response');
    }
    return repaired.slice(firstBrace, lastBrace + 1);
  }

  validateStructuredResponse(parsed, auditResult) {
    const validated = {};

    for (const [key, validator] of Object.entries(this.schemaValidators)) {
      if (parsed[key] === undefined) {
        if (key === 'recommendations') {
          throw new Error('Model response missing recommendations');
        }
        continue;
      }

      validated[key] = validator(parsed[key]);
    }

    const meta = {
      auditTitle: auditResult.title,
      score: auditResult.score,
      severity: auditResult.severity
    };

    return { ...meta, ...validated };
  }

  compareWithBaseline(auditResult, llmRecommendations) {
    const baseline = ensureArray(auditResult.findings).map((finding) => ({
      title: finding.title,
      recommendation: finding.recommendation,
      impact: finding.impact,
      effort: finding.effort
    }));

    const enhanced = ensureArray(llmRecommendations.recommendations);
    return {
      baselineCount: baseline.length,
      llmCount: enhanced.length,
      improvement: Math.max(0, enhanced.length - baseline.length),
      coverage: baseline.length ? Math.min(1, enhanced.length / baseline.length) : 1
    };
  }

  buildFallbackTemplate(key) {
    return `You are an AI assistant tasked with generating actionable recommendations for the audit: ${key}. Provide three numbered recommendations with priority, impact, effort, description, and why it matters. Return valid JSON.`;
  }

  buildFallbackResponse(auditResult, promptKey, error) {
    return {
      auditTitle: auditResult.title,
      score: auditResult.score,
      severity: auditResult.severity,
      summary: `Failed to retrieve AI recommendations for ${auditResult.title}. Error: ${error.message}`,
      recommendations: auditResult.findings.map((finding, index) => ({
        priority: index + 1,
        title: finding.title,
        impact: finding.impact,
        effort: finding.effort,
        description: finding.recommendation,
        why_it_matters: finding.message
      })),
      comparison: {
        baselineCount: auditResult.findings.length,
        llmCount: auditResult.findings.length,
        improvement: 0,
        coverage: 1
      },
      fallback: true,
      raw: null
    };
  }
}

module.exports = LLMAnalyzer;
