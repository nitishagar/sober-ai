const { EventEmitter } = require('events');
const axios = require('axios');
const LLMAnalyzer = require('../../../src/llm/analyzer');

jest.mock('axios');

describe('LLMAnalyzer', () => {
  const auditResult = {
    title: 'Semantic HTML Structure Quality',
    score: 45,
    severity: 'warning',
    displayValue: 'Needs improvement',
    findings: [
      {
        type: 'warning',
        title: 'Missing <main> element',
        message: 'No <main> element found.',
        recommendation: 'Wrap primary content in <main>.',
        impact: 'high',
        effort: 'low'
      }
    ],
    details: {
      semantic_score: 45,
      has_main: false
    }
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.OLLAMA_ENDPOINT = 'http://localhost:11434';
  });

  afterAll(() => {
    delete process.env.OLLAMA_ENDPOINT;
  });

  const buildMockResponse = () => ({
    summary: 'Summary of issues',
    references: ['https://example.com/docs'],
    recommendations: [
      {
        priority: 1,
        title: 'Add <main> landmark',
        impact: 'High',
        effort: 'Low',
        description: 'Introduce a single <main> element wrapping the core content.',
        why_it_matters: 'AI agents rely on <main> to identify core content.',
        code_example: '<main>...</main>'
      },
      {
        priority: 2,
        title: 'Fix heading hierarchy',
        impact: 'Medium',
        effort: 'Medium',
        description: 'Ensure headings follow sequential order without skips.',
        why_it_matters: 'Correct hierarchy improves document outlines.',
        code_example: '<h1>Title</h1>\n<h2>Section</h2>'
      },
      {
        priority: 3,
        title: 'Improve link text',
        impact: 'Low',
        effort: 'Low',
        description: 'Replace generic link labels with descriptive text.',
        why_it_matters: 'Descriptive links give AI context about destinations.',
        code_example: '<a href="/pricing">View pricing</a>'
      }
    ]
  });

  it('returns structured recommendations for non-streaming responses', async () => {
    const payload = buildMockResponse();
    axios.post.mockResolvedValue({
      data: {
        response: JSON.stringify(payload)
      }
    });

    const analyzer = new LLMAnalyzer();
    const result = await analyzer.analyze(auditResult, 'semantic_improvements');

    expect(result.summary).toBe(payload.summary);
    expect(result.references).toEqual(payload.references);
    expect(result.recommendations).toHaveLength(3);
    expect(result.recommendations[0]).toMatchObject({
      priority: 1,
      title: 'Add <main> landmark',
      impact: 'High',
      effort: 'Low'
    });
    expect(result.comparison.llmCount).toBe(3);
    expect(result.raw).toEqual(JSON.stringify(payload));
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        model: 'qwen3:4b',
        stream: false
      }),
      expect.any(Object)
    );
  });

  it('aggregates streaming responses and emits progress tokens', async () => {
    const emitter = new EventEmitter();
    axios.post.mockResolvedValue({ data: emitter });

    const analyzer = new LLMAnalyzer();
    const onProgress = jest.fn();

    const analyzePromise = analyzer.analyze(auditResult, 'ssr_analysis', onProgress);

    const streamingPayload = buildMockResponse();
    const encoded = JSON.stringify(streamingPayload);
    const chunk1 = JSON.stringify({ response: encoded.slice(0, 50) });
    const chunk2 = JSON.stringify({ response: encoded.slice(50) });
    const doneChunk = JSON.stringify({ done: true });

    setTimeout(() => {
      emitter.emit('data', Buffer.from(`${chunk1}\n`));
      emitter.emit('data', Buffer.from(`${chunk2}\n`));
      emitter.emit('data', Buffer.from(`${doneChunk}\n`));
      emitter.emit('end');
    }, 0);

    const result = await analyzePromise;

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[0][0]).toBe(encoded.slice(0, 50));
    expect(onProgress.mock.calls[1][0]).toBe(encoded.slice(50));
    expect(result.summary).toBe(streamingPayload.summary);
    expect(result.recommendations).toHaveLength(3);
    expect(result.raw).toContain('Summary of issues');
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        stream: true
      }),
      expect.objectContaining({ responseType: 'stream' })
    );
  });

  it('accepts custom provider settings', () => {
    const analyzer = new LLMAnalyzer(null, {
      provider: 'ollama_local',
      endpoint: 'http://custom:11434',
      model: 'llama2:7b'
    });

    expect(analyzer.provider).toBeDefined();
    expect(analyzer.provider.name).toBe('ollama_local');
    expect(analyzer.provider.model).toBe('llama2:7b');
  });

  it('uses config from models.yaml when no provider settings given', () => {
    const analyzer = new LLMAnalyzer();
    expect(analyzer.provider).toBeDefined();
    expect(analyzer.provider.model).toBe('qwen3:4b');
  });

  it('falls back to audit findings when LLM fails', async () => {
    axios.post.mockRejectedValue(new Error('Connection refused'));

    const analyzer = new LLMAnalyzer();
    const result = await analyzer.analyze(auditResult, 'content_optimization');

    expect(result.fallback).toBe(true);
    expect(result.recommendations).toHaveLength(auditResult.findings.length);
    expect(result.summary).toContain('Failed to retrieve AI recommendations');
  });
});
