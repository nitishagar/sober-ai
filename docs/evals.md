# AI evals — SoberAI Optimizer

The eval gate for the audit engine's module contract. Framework: **evalite** 0.19.0 + vitest 4.1.11 (both pinned), running in-process over pure modules. Chosen after trialing promptfoo and evalite — see `docs/evals/comparison.md`; per-trial evidence in `docs/evals/*-notes.md` and `docs/evals/*-run-log.md`.

## How to run offline

```bash
npm run test:evals:vitest      # = evalite run --threshold 100
```

The suite makes zero network calls by construction (it exercises `Scorer`, `SchemaCoverageAudit`, `LLMAnalyzer` parsing/validation and `ProviderFactory` as pure in-process modules — the analyzer instance is built against an endpoint it never dials). Rigorous proof:

```bash
unshare -rn sh -c 'ip link set lo up && npm run test:evals:vitest'
```

(A fresh network namespace ships with loopback DOWN — raise it or loopback connects fail with ENETUNREACH.)

The gate exits non-zero if any eval scores below 1 (`--threshold 100`).

## How to run against a live model

The judge-scored case exists in `evals/evalite/judge.live.eval.ts` and is committed **skipped** (`evalite.skip`) — there is no judge credential here, and the scorer body is a stub (`() => 0`). Enabling it is deliberate:

1. Replace `evalite.skip` with `evalite` and implement the scorer against a pinned judge (model id + `temperature: 0` + fixed rubric text; cache verdicts keyed on input/output/rubric as part of that implementation).
2. `EVAL_LIVE=1 OPENAI_API_KEY=<key> npx evalite run judge.live` from the repo root.

The offline gate never needs a key and never calls a model; nothing reads `EVAL_LIVE` in the committed suite today.

For live LLM-behavior checks against the real HTTP API (recommendation quality end-to-end), the promptfoo trial branch (`evals/trial-promptfoo`) carries `evals/promptfoo.live.yaml` with a pinned judge — never part of the offline gate.

## How to add a case

1. Add an `evalite('<case-name>', { data, task, scorers })` block to `evals/evalite/modules.eval.ts` (or a sibling `*.eval.ts` — evalite discovers that suffix automatically).
2. `data` entries are `{ input, expected }`; scorers return `1` (pass) or `0` (fail) — never a raw boolean.
3. Prefer decision-table cases (kind/threshold tables) that pin real module behavior; a boundary edit is only detectable if a fixture point sits between the old and new threshold.
4. Run `npm run test:evals:vitest`. Keep case names purpose-phrased (`analyzer-contract-mandatory-recommendations`, not `test7`).

## How the judge model is pinned and cached

- **Pinning**: the judge is a per-scorer declaration (model id + `temperature: 0` + fixed rubric text) — never a floating default.
- **Caching**: no judge-verdict cache exists yet — it is part of the live scorer implementation (keyed on input/output/rubric so unchanged cases never re-call the judge). evalite's local storage (`.evalite/`, gitignored) keeps run history and scores. The offline gate makes no network call either way.

## What CI does on failure

`.github/workflows/evals.yml` runs `npm run test:evals:vitest` on every push to any branch and every PR. A failing eval (score below threshold) fails the job with the eval name, failing data case, and scorer score in the log; the skipped judge case cannot fail the job (it does not run without enabling). The gate is additive to the existing `ci.yml` test job — `npm run test:ci` remains the primary gate.
