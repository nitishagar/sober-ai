const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class LLMAnalyzer {
  constructor() {
    this.endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    this.model = 'qwen2.5:7b';
    this.promptCache = new Map();
    this.loadPrompts();
  }

  loadPrompts() {
    const promptDir = path.join(__dirname, 'prompts');
    const promptFiles = {
      ssr_analysis: 'ssr-analysis.txt',
      schema_recommendations: 'schema-recommendations.txt',
      semantic_improvements: 'semantic-improvements.txt',
      content_optimization: 'content-optimization.txt'
    };

    for (const [key, filename] of Object.entries(promptFiles)) {
      const filePath = path.join(promptDir, filename);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        this.promptCache.set(key, content);
        logger.debug(`Loaded prompt: ${key}`);
      } catch (error) {
        logger.warn(`Failed to load prompt ${key}: ${error.message}`);
      }
    }
  }

  async analyze(auditResult, promptType, onProgress = null) {
    logger.info(`LLM Analysis: ${promptType}`);

    try {
      const systemPrompt = this.promptCache.get(promptType) || this.getDefaultPrompt(promptType);
      const userPrompt = this.buildUserPrompt(auditResult);

      const response = await this.callLLM(systemPrompt, userPrompt, onProgress);

      return {
        summary: response.summary || this.extractSummary(response.text),
        recommendations: response.recommendations || this.extractRecommendations(response.text),
        codeExamples: response.codeExamples || [],
        priority: response.priority || 'medium',
        estimatedImpact: response.estimatedImpact || 'Improved AI agent visibility',
        fullText: response.text
      };
    } catch (error) {
      logger.error(`LLM analysis failed: ${error.message}`);
      return {
        error: true,
        message: 'Failed to generate AI-powered recommendations',
        fallback: this.generateFallbackRecommendations(auditResult)
      };
    }
  }

  async callLLM(systemPrompt, userPrompt, onProgress = null) {
    const startTime = Date.now();

    try {
      // If no progress callback, use non-streaming mode
      if (!onProgress) {
        const response = await axios.post(
          `${this.endpoint}/api/generate`,
          {
            model: this.model,
            prompt: `${systemPrompt}\n\n${userPrompt}`,
            stream: false,
            options: {
              temperature: 0.3,
              top_p: 0.9,
              num_predict: 2048
            }
          },
          {
            timeout: 60000 // 60 second timeout
          }
        );

        const duration = Date.now() - startTime;
        logger.info(`LLM response received in ${duration}ms`);

        return {
          text: response.data.response,
          ...this.parseStructuredResponse(response.data.response)
        };
      }

      // Streaming mode
      let fullText = '';
      const response = await axios.post(
        `${this.endpoint}/api/generate`,
        {
          model: this.model,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: true,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 2048
          }
        },
        {
          timeout: 60000,
          responseType: 'stream'
        }
      );

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n').filter(line => line.trim());
            for (const line of lines) {
              const json = JSON.parse(line);
              if (json.response) {
                fullText += json.response;
                onProgress(json.response);
              }
              if (json.done) {
                const duration = Date.now() - startTime;
                logger.info(`LLM streaming completed in ${duration}ms`);
                resolve({
                  text: fullText,
                  ...this.parseStructuredResponse(fullText)
                });
              }
            }
          } catch (error) {
            logger.error(`Error parsing stream chunk: ${error.message}`);
          }
        });

        response.data.on('error', (error) => {
          reject(error);
        });

        response.data.on('end', () => {
          if (fullText) {
            resolve({
              text: fullText,
              ...this.parseStructuredResponse(fullText)
            });
          }
        });
      });
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Ollama service is not running. Please start Ollama with: docker-compose up ollama');
      }
      throw error;
    }
  }

  parseStructuredResponse(text) {
    // Try to extract structured information from the response
    const result = {
      summary: '',
      recommendations: [],
      codeExamples: [],
      priority: 'medium'
    };

    // Extract summary (first paragraph)
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      result.summary = lines[0];
    }

    // Extract recommendations (lines starting with numbers, bullets, or "Recommendation:")
    const recPattern = /^[\d\-\*•][\.\):]?\s+(.+)/;
    for (const line of lines) {
      if (recPattern.test(line) || line.toLowerCase().includes('recommendation')) {
        result.recommendations.push(line.replace(recPattern, '$1'));
      }
    }

    // Extract code examples (text between backticks or code blocks)
    const codePattern = /```[\w]*\n?([\s\S]*?)```/g;
    let match;
    while ((match = codePattern.exec(text)) !== null) {
      result.codeExamples.push(match[1].trim());
    }

    // Determine priority from keywords
    const lowerText = text.toLowerCase();
    if (lowerText.includes('critical') || lowerText.includes('urgent')) {
      result.priority = 'high';
    } else if (lowerText.includes('minor') || lowerText.includes('optional')) {
      result.priority = 'low';
    }

    return result;
  }

  buildUserPrompt(auditResult) {
    return `
Audit Results:
- Audit: ${auditResult.title}
- Score: ${auditResult.score}/100
- Severity: ${auditResult.severity}
- Display Value: ${auditResult.displayValue}

Findings:
${auditResult.findings.map((f, i) => `${i + 1}. [${f.type.toUpperCase()}] ${f.title}
   ${f.message}
   Current Recommendation: ${f.recommendation}
   Impact: ${f.impact}, Effort: ${f.effort}`).join('\n\n')}

Details:
${JSON.stringify(auditResult.details, null, 2)}

Please provide:
1. A brief summary of the main issues
2. Specific, actionable recommendations with implementation steps
3. Code examples where applicable
4. Priority ranking for each recommendation
`;
  }

  getDefaultPrompt(promptType) {
    const prompts = {
      ssr_analysis: `You are an expert in web development and AI agent optimization. Analyze the SSR (Server-Side Rendering) audit results and provide specific, actionable recommendations for improving content accessibility to AI crawlers like GPTBot, ClaudeBot, and PerplexityBot. Focus on practical implementation steps.`,

      schema_recommendations: `You are an expert in Schema.org structured data and SEO. Analyze the schema coverage audit results and provide specific recommendations for implementing or improving structured data markup. Include JSON-LD code examples that follow Schema.org best practices.`,

      semantic_improvements: `You are an expert in semantic HTML and web accessibility. Analyze the semantic structure audit results and provide recommendations for improving HTML structure, heading hierarchy, and landmark usage. Focus on changes that help AI agents understand content organization.`,

      content_optimization: `You are an expert in content optimization for AI and machine learning systems. Analyze the content extractability audit results and provide recommendations for improving content structure, density, and organization for better AI comprehension.`
    };

    return prompts[promptType] || `You are an AI agent optimization expert. Analyze the audit results and provide specific, actionable recommendations.`;
  }

  extractSummary(text) {
    const lines = text.split('\n').filter(l => l.trim());
    return lines[0] || 'Analysis completed. See recommendations below.';
  }

  extractRecommendations(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const recPattern = /^[\d\-\*•][\.\):]?\s+(.+)/;

    return lines
      .filter(line => recPattern.test(line))
      .map(line => line.replace(recPattern, '$1'))
      .slice(0, 5); // Top 5 recommendations
  }

  generateFallbackRecommendations(auditResult) {
    // Generate basic recommendations from audit findings without LLM
    return {
      summary: `Based on the ${auditResult.title} audit, ${auditResult.findings.length} issue(s) were found.`,
      recommendations: auditResult.findings.map(f => f.recommendation),
      note: 'These are automated recommendations. For more detailed analysis, ensure the LLM service is running.'
    };
  }
}

module.exports = LLMAnalyzer;
