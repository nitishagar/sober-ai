# promptfoo trial run log — sober-ai (2026-09-06)

Branch: `evals/trial-promptfoo` · framework: promptfoo 0.122.2 (pinned) · suite: `evals/promptfoo.config.yaml` (11 wire-level cases over 8 providers) · runner: `evals/run-offline.mjs` (latency budgets: health ≤2 s, audit-driving ≤45 s).

## 1. First green run (all cases pass)

```
Results:
  ✓ 11 passed (100%)
  0 failed (0%)
  0 errors (0%)
Duration: 11s (concurrency: 4)
[run-offline] 11 cases green; total measured latency 21023ms
```

Zero-network proof — same suite inside a network namespace with loopback raised (fresh netns ships with `lo` DOWN; without `ip link set lo up` loopback connect fails with ENETUNREACH):

```
$ unshare -rn sh -c 'ip link set lo up && npm run test:evals'
Results:  ✓ 11 passed (100%)
[run-offline] 11 cases green; total measured latency 20166ms
```

Teardown proof: the immediately following run is also fully green (no leaked listeners/timers affect the next boot).

Existing gate untouched: `npm run test:ci` pass-set unchanged (evals live in `evals/`, outside jest `testMatch`).

## 2. Deliberate one-line regression (system under test)

Change: `src/core/auditor.js:158` — the `ssrReadiness:` category key renamed to `ssrReadiness2:` (category-contract drift).

```
Results:
  ✓ 9 passed (81.82%)
  ✗ 2 failed (18.18%)
[run-offline] promptfoo eval exited 100
```

Failing cases (from `evals/.last-run.json`):

```
RED CASE: score-categories-snapshot: the five category keys are unchanged
  err: Custom function returned false  (Object.keys(categories).sort() mismatch)
RED CASE: sse-phase-order: events stream in phase order and terminate with reportId + scores
  err: Custom function returned false  (completion payload no longer matches the contract)
```

Both failures are legitimate sensitivity (the renamed key propagates into scores and the SSE completion payload). Failure-message quality: **good** — case name + verbatim assertion in the log; full expected/actual in the JSON export/viewer.

## 3. Revert + green again

```
$ git checkout src/core/auditor.js
Results:  ✓ 11 passed (100%)
[run-offline] 11 cases green; total measured latency 20628ms
```

## Debugging notes captured along the way (honest record of the trial)
- First full run: 3/11 — root cause was the runner using `spawnSync`, which **blocked the launcher's event loop** and froze the in-process stubs + canned site (audits timed out on `page.goto networkidle`, the health cache expired against a frozen stub). Fixed by async `spawn`; the stubs must live in an unblocked process.
- promptfoo `file://` javascript providers are instantiated with `new` — the module must export a synchronous factory returning `{ id(), callApi() }`; dispatch by `options.config.function` (the provider `id` is the file path, shared by both probes).
- Test→provider targeting uses `providers: ['<label>']` (array); a singular `provider: '<label>'` is parsed as an inline provider path instead.
- `.promptfoo-cache` + `.last-run.json` gitignored.
