# evalite trial notes — sober-ai (2026-09-06)

## Measured
- **Wall-clock setup time (install → first green run): ~30 min.** Install needed `--legacy-peer-deps` (npm arborist crash on this lockfile); fixture-shape discovery (gaps object, provider keys) consumed the rest.
- **Configuration lines added:** ~12 (two scripts + .gitignore). No config file — evalite discovers `**/*.eval.ts` itself.
- **Eval code/data lines added:** ~250 measured (modules.eval.ts ~230, 8 evals; judge.live.eval.ts ~55, skipped).
- **Suite runtime:** ~20 ms (24 data cases, pure functions). Wall-clock with node startup ~2 s.
- **Offline by default: YES** — netns-proven (`unshare -rn sh -c 'ip link set lo up && …'`); the suite imports pure modules only; the analyzer instance never connects (ctor builds the provider object without dialing).
- **Failure message quality: good** — eval name + data case + failing scorer with score; expected/actual in the export.
- **Surprises:** (1) evalite in a jest repo coexists without any interference — separate runners, disjoint file globs, pass-set byte-identical; (2) `ProviderFactory.create` throws without keys for OpenAI/Anthropic (Ollama does not) — an asymmetry worth pinning in evals; (3) `validateStructuredResponse` enforces ONLY `recommendations` (non-empty, 5 fields) and is lenient on summary/references — now pinned by the contract eval; (4) the grade-boundary regression lesson: a boundary edit is only detectable if a fixture point sits between the old and new threshold.

## Survey open questions answered
6. **Is a separate eval script acceptable in the jest repo?** Yes — and evalite is the LOWEST-friction option observed: jest untouched, `test:evals:vitest` additive, CI additive. The friction the survey worried about (second runner in the repo) materialized as two extra devDependencies and zero test conflicts.
- Also: same vitest-4 compatibility verdict as lumen (evalite 0.19 targets vitest 4; `@vitest/runner ^4.0`).

## Rubric re-score from observation (0–3; weights in comparison.md)
1. Setup 2 (install friction + fixture discovery)
2. Runner 3 (vitest-native, additive script)
3. Offline 3 (pure modules — nothing to gate at all)
4. Deterministic 3 (decision tables over real module behavior)
5. Judge 2 (mechanism exists; case written-and-skipped, no live verification)
6. Trajectory 1 (single-call service; no trajectory capture)
7. MCP 1 (no MCP surface — N/A here)
8. Providers 2 (factory selection pinned; no live provider runs)
9. Dataset 3 (data/expected in code, diffable)
10. Baseline 3 (sqlite run history + threshold gating)
11. CI 3 (threshold exit code; additive job)
12. Cost 3 (MIT, free)
13. Health 2 (0.19.0, months between releases)
14. Language 3 (TypeScript evals in a JS repo — esbuild transpiles, no new gate)

**Weighted total (observed): 137 / 159** = Σ(score × weight) over the 14 dimensions above (weights 4,5,5,5,4,4,3,3,4,4,5,3,2,2; scale 0–3, max 159).

## Biggest risk of picking it
In-process only: it pins module behavior (scorer, validators, factory) but never proves the HTTP API a real client calls — the Express route contract is invisible to this suite.
