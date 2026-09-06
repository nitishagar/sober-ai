/**
 * In-process evalite suite over sober-ai's pure modules (offline trial:
 * evals/trial-evalite). Deterministic only: Scorer, the schema-coverage audit,
 * LLMAnalyzer parsing/validation and ProviderFactory selection — no HTTP, no
 * Playwright, no database. Wire-level behavior lives in the promptfoo suite
 * (evals/promptfoo.config.yaml).
 *
 * Run: npm run test:evals:vitest   (from the repo root)
 */
import { performance } from 'node:perf_hooks';
import { evalite } from 'evalite';
import Scorer from '../../src/core/scorer.js';
import SchemaCoverageAudit from '../../src/audits/schema-coverage.audit.js';
import LLMAnalyzer from '../../src/llm/analyzer.js';
import ProviderFactory from '../../src/llm/providers/ProviderFactory.js';

interface ScoredResult {
  score: number;
  severity?: string;
}

/** Builds audit results whose overall score is exactly `value` under weights {a:100}. */
const single = (value: number): Record<string, ScoredResult> => ({ a: { score: value } });

const analyzer = new LLMAnalyzer(null, {
  provider: 'ollama_local',
  endpoint: 'http://127.0.0.1:9', // nothing listens here; the ctor never connects
  model: 'eval-fixture',
});

const VALID_REC = {
  priority: 1,
  title: 'Add JSON-LD structured data',
  impact: 'high',
  effort: 'low',
  description: 'Add a JSON-LD script block describing the page entity.',
};

evalite('scorer-grade-boundaries', {
  data: [
    { input: single(95), expected: 'A' },
    { input: single(85), expected: 'B' },
    { input: single(75), expected: 'C' },
    { input: single(65), expected: 'D' },
    { input: single(55), expected: 'F' },
  ],
  task: async (auditResults) => {
    const scorer = new Scorer({ a: 100 });
    return scorer.calculate(auditResults as Record<string, ScoredResult>).grade;
  },
  scorers: [
    {
      name: 'grade-matches-boundary-table',
      scorer: ({ output, expected }) => (expected !== undefined && output === expected ? 1 : 0),
    },
  ],
});

evalite('scorer-weight-normalization', {
  data: [
    {
      // Weights sum to 120 → normalized to 66.67/33.33 → overall 83.33 → 83
      input: { weights: { a: 80, b: 40 }, results: { a: { score: 100 }, b: { score: 50 } } },
      expected: { overall: 83, grade: 'B', weightA: 80 * (100 / 120) },
    },
  ],
  task: async (input) => {
    const { weights, results } = input as { weights: Record<string, number>; results: Record<string, ScoredResult> };
    const scorer = new Scorer({ ...weights });
    return scorer.calculate(results);
  },
  scorers: [
    {
      name: 'weights-renormalized-and-overall-correct',
      scorer: ({ output, expected }) => {
        if (expected === undefined) return 0;
        const o = output as { overall: number; grade: string; categories: Record<string, { weight: number }> };
        const exp = expected as { overall: number; grade: string; weightA: number };
        return o.overall === exp.overall && o.grade === exp.grade && Math.abs(o.categories.a.weight - exp.weightA) < 0.01 ? 1 : 0;
      },
    },
  ],
});

evalite('schema-coverage-golden', {
  data: [
    { input: 95, expected: { score: 100, severity: 'pass' } },
    { input: 75, expected: { score: 75, severity: 'pass' } },
    { input: 50, expected: { score: 50, severity: 'warning' } },
    { input: 10, expected: { score: 25, severity: 'warning' } },
    { input: 0, expected: { score: 0, severity: 'critical' } },
  ],
  task: async (coverageScore) => {
    const audit = new SchemaCoverageAudit();
    const result = audit.audit({
      schemaCount: coverageScore > 0 ? 2 : 0,
      coverageScore,
      schemaTypes: [],
      detected_industry: 'generic',
      industry_specific_gaps: { required: [], recommended: [] },
      errors: [],
    }) as { score: number; severity: string };
    return { score: result.score, severity: result.severity };
  },
  scorers: [
    {
      name: 'golden-score-and-severity',
      scorer: ({ output, expected }) => {
        if (expected === undefined) return 0;
        const o = output as { score: number; severity: string };
        const e = expected as { score: number; severity: string };
        return o.score === e.score && o.severity === e.severity ? 1 : 0;
      },
    },
  ],
});

evalite('analyzer-json-extraction', {
  data: [
    {
      input: '```json\n{"summary":"s","recommendations":[' + JSON.stringify(VALID_REC) + ']}\n```',
      expected: { kind: 'parsed', summary: 's' },
    },
    {
      input: 'Here is my analysis: {"summary":"s2","recommendations":[' + JSON.stringify(VALID_REC) + ']} hope it helps',
      expected: { kind: 'parsed', summary: 's2' },
    },
    { input: 'Test LLM response.', expected: { kind: 'throws' } },
    { input: '', expected: { kind: 'throws' } },
  ],
  task: async (rawText) => {
    try {
      const parsed = analyzer.parseResponse(rawText as string) as { summary?: string };
      return { kind: 'parsed', summary: parsed.summary ?? '' };
    } catch {
      return { kind: 'throws' };
    }
  },
  scorers: [
    {
      name: 'extraction-decision-table',
      scorer: ({ output, expected }) => (expected !== undefined && JSON.stringify(output) === JSON.stringify(expected) ? 1 : 0),
    },
  ],
});

evalite('analyzer-repair-json-leniency', {
  data: [
    {
      // Unquoted keys + trailing comma — repairJson must make it parseable.
      input: '{ summary: "s", recommendations: [{ priority: 1, title: "t", impact: "i", effort: "e", description: "d", }] }',
      expected: { kind: 'parsed' },
    },
    { input: '{ broken', expected: { kind: 'throws' } },
  ],
  task: async (rawText) => {
    try {
      analyzer.parseResponse(rawText as string);
      return { kind: 'parsed' };
    } catch {
      return { kind: 'throws' };
    }
  },
  scorers: [
    {
      name: 'repair-leniency-table',
      scorer: ({ output, expected }) => (expected !== undefined && JSON.stringify(output) === JSON.stringify(expected) ? 1 : 0),
    },
  ],
});

evalite('analyzer-contract-mandatory-recommendations', {
  data: [
    {
      // The ONLY mandatory field: recommendations must be a non-empty valid array.
      input: { summary: '', references: [], recommendations: [] },
      expected: { kind: 'throws' },
    },
    {
      input: { recommendations: [VALID_REC] },
      expected: { kind: 'accepted' },
    },
    {
      input: { recommendations: [{ ...VALID_REC, title: '' }] },
      expected: { kind: 'throws' },
    },
  ],
  task: async (parsed) => {
    try {
      analyzer.validateStructuredResponse(parsed as never, { title: 't', score: 50, findings: [] });
      return { kind: 'accepted' };
    } catch {
      return { kind: 'throws' };
    }
  },
  scorers: [
    {
      name: 'mandatory-vs-lenient-split',
      scorer: ({ output, expected }) => (expected !== undefined && JSON.stringify(output) === JSON.stringify(expected) ? 1 : 0),
    },
  ],
});

evalite('provider-factory-selection', {
  data: [
    { input: { provider: 'ollama_local' }, expected: { className: 'OllamaProvider', endpoint: 'http://localhost:11434' } },
    { input: { provider: 'openai', apiKey: 'eval-fixture-key' }, expected: { className: 'OpenAIProvider' } },
    { input: { provider: 'anthropic', apiKey: 'eval-fixture-key' }, expected: { className: 'AnthropicProvider' } },
  ],
  task: async (settings) => {
    const provider = ProviderFactory.create(settings as never) as { constructor: { name: string }; endpoint?: string };
    return { className: provider.constructor.name, endpoint: provider.endpoint ?? '' };
  },
  scorers: [
    {
      name: 'provider-class-and-endpoint',
      scorer: ({ output, expected }) => {
        if (expected === undefined) return 0;
        const o = output as { className: string; endpoint?: string };
        const e = expected as { className: string; endpoint?: string };
        return o.className === e.className && (e.endpoint === undefined || o.endpoint === e.endpoint) ? 1 : 0;
      },
    },
  ],
});

evalite('latency-budget', {
  data: [
    { input: { iterations: 100 }, expected: { budgetMs: 1000 } },
  ],
  task: async (input) => {
    const { iterations } = input as { iterations: number };
    const scorer = new Scorer({ a: 20, b: 20, c: 20, d: 20, e: 20 });
    const results = { a: { score: 50 }, b: { score: 50 }, c: { score: 50 }, d: { score: 50 }, e: { score: 50 } };
    const start = performance.now();
    for (let i = 0; i < iterations; i += 1) scorer.calculate(results);
    return { latencyMs: performance.now() - start };
  },
  scorers: [
    {
      name: 'pure-module-eval-under-budget',
      scorer: ({ output, expected }) => {
        if (expected === undefined) return 0;
        return (output as { latencyMs: number }).latencyMs < (expected as { budgetMs: number }).budgetMs ? 1 : 0;
      },
    },
  ],
});

evalite('llm-fallback-path', {
  data: [
    {
      // The analyzer tier of the two-tier partial-failure contract: when the
      // provider call fails (loopback endpoint that refuses connections —
      // instant, offline), analyze() must fall back with `fallback: true`,
      // findings-derived recommendations, and NO `error` field (auditor-tier
      // failures carry `{error, message}` instead — asserted on the wire by
      // the promptfoo suite on `evals/trial-promptfoo`).
      input: {
        auditResult: {
          title: 'Schema Coverage',
          score: 50,
          severity: 'warning',
          display_value: 'Fair - Basic schemas present, missing key types',
          findings: [
            { title: 'Add JSON-LD', impact: 'high', recommendation: 'Add a JSON-LD block.', message: 'No structured data found' },
          ],
          details: {},
        },
        promptKey: 'schema_coverage',
      },
      expected: { fallback: true, recommendationCount: 1, hasError: false },
    },
  ],
  task: async (input) => {
    const { auditResult, promptKey } = input as { auditResult: Record<string, unknown>; promptKey: string };
    const response = (await analyzer.analyze(auditResult as never, promptKey)) as {
      fallback?: boolean;
      recommendations: { title: string }[];
      error?: string;
    };
    return {
      fallback: response.fallback === true,
      recommendationCount: Array.isArray(response.recommendations) ? response.recommendations.length : 0,
      hasError: 'error' in response,
    };
  },
  scorers: [
    {
      name: 'analyzer-tier-fallback-flagged-not-thrown',
      scorer: ({ output, expected }) => (expected !== undefined && JSON.stringify(output) === JSON.stringify(expected) ? 1 : 0),
    },
  ],
});
