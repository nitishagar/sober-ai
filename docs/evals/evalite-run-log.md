# evalite trial run log — sober-ai (2026-09-06)

Branch: `evals/trial-evalite` · framework: evalite 0.19.0 + vitest 4.1.11 (both pinned exact) · suite: `evals/evalite/modules.eval.ts` (8 evals, 24 data cases, + 1 skipped judge eval) · gate: `npm run test:evals:vitest` = `evalite run --threshold 100`.

## 1. First green run (all cases pass)

```
 100% evals/evalite/modules.eval.ts  (24 evals)
      Score  100%
  Threshold  100% (passed)
 Eval Files  2
      Evals  24
   Duration  20ms
```

Zero-network proof — network namespace with loopback raised:

```
$ unshare -rn sh -c 'ip link set lo up && npm run test:evals:vitest'
      Score  100%
  Threshold  100% (passed)
```

Teardown/interference proof: jest pass-set unchanged after installing vitest 4 alongside it — `npm run test:ci` = 278 passed (278) before AND after (byte-identical pass-set; the suites are separate runners and the eval files sit outside jest's `testMatch`).

## 2. Deliberate one-line regression (system under test)

Change: `src/core/scorer.js:61` — grade boundary `if (score >= 90) return 'A';` → `if (score >= 98) return 'A';`.

```
      Score  96%
  Threshold  100% (failed)
RED CASE: scorer-grade-boundaries | input: {"a":{"score":95}} | scores: [{"n":"grade-matches-boundary-table","score":0}]
```

Failure-message quality: **good** — the eval name, the exact data case (`score: 95`), and the failing scorer are all identified; the export/viewer shows expected `A` vs actual `B`. (A first attempt at the regression, `>= 90 → >= 95`, did NOT go red — the fixture boundary 95 satisfies both thresholds; a boundary edit must move past a fixture point to be detectable. Honest note: the suite's grade-boundary data points define what drift it can catch.)

## 3. Revert + green again

```
$ git checkout src/core/scorer.js
      Score  100%
  Threshold  100% (passed)
```

## Notes captured during the run
- evalite 0.19 only discovers `**/*.eval.?(m)ts` — TypeScript files, in a JavaScript repo. Works without a TS gate: vitest transpiles via esbuild; the repo's eslint (`eslint src/`) does not lint `evals/`.
- The first run failed 7 evals on fixture mistakes (not SUT bugs): `industry_specific_gaps` is an OBJECT `{required, recommended}` (I passed an array → `generateFindings` crashed on `.required.length`), and `ProviderFactory.create` THROWS without an API key for openai/anthropic (fixture keys fix it; the Ollama path constructs keyless by design).
- `npm install` (arborist) crashed twice with `Cannot read properties of null (reading 'edgesOut')` on this lockfile; `--legacy-peer-deps` installed cleanly. Recorded as an environment friction note, not a framework defect.
