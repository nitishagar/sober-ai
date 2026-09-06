/**
 * LLM-as-judge eval case — SKIPPED in the offline gate (no credentials in this
 * environment; the offline gate must make zero network calls). The case is
 * written and skipped with a reason per the trial contract. Enabling it is a
 * deliberate two-step (see docs/evals.md):
 *   1. implement the scorer against a pinned judge (model id + temperature 0
 *      + fixed rubric; cache verdicts keyed on input/output/rubric),
 *   2. `evalite skip` → `evalite` and run with EVAL_LIVE=1 + the judge key.
 */
import { evalite } from 'evalite';
import LLMAnalyzer from '../../src/llm/analyzer.js';

const analyzer = new LLMAnalyzer(null, {
  provider: 'ollama_local',
  endpoint: 'http://127.0.0.1:9', // never connected in the offline gate
  model: 'eval-fixture',
});

const FIXTURE_AUDIT = {
  title: 'Schema Coverage',
  score: 50,
  severity: 'warning',
  findings: [
    { title: 'Add JSON-LD', impact: 'high', recommendation: 'Add a JSON-LD block.', message: 'No structured data found' },
  ],
};

evalite.skip('judge-quality', {
  data: [
    {
      input: 'plain text LLM response (fallback path)',
      expected: 'summary mentions the failure and recommendations come from findings',
    },
  ],
  task: async () => {
    // Produces a real fallback recommendation set over the fixture audit —
    // the object a live judge would score for faithfulness/actionability.
    return analyzer.buildFallbackResponse(FIXTURE_AUDIT, 'schema_coverage', new Error('judge not configured'));
  },
  scorers: [
    {
      name: 'recommendation-faithfulness-rubric',
      description:
        'Pinned judge (e.g. openai:gpt-4.1-mini, temperature 0) scoring the fallback recommendations against the fixed rubric: every item is actionable, evidence-tied to the fixture findings, and fabricates nothing.',
      scorer: () => 0,
    },
  ],
});
