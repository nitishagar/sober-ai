# Eval framework comparison — sober-ai (2026-09-06)

Trials on branches `evals/trial-promptfoo` (promptfoo 0.122.2) and `evals/trial-evalite` (evalite 0.19.0 + vitest 4.1.11), both from main @ c592416. All runs offline-proven (`unshare -rn` with loopback raised), all measurements in the per-trial notes.

## Measured table

| Dimension | promptfoo | evalite |
|---|---|---|
| Setup minutes (install → first green) | ~55 | ~30 |
| Config lines | ~410 (config + launcher + probes + runner + CI) | ~12 (scripts + gitignore) |
| Eval code/data lines | ~180 of config are assertions (180-line YAML) | ~285 (248-line eval file + skipped judge) |
| Suite runtime (wall) | ~15 s (3 Playwright audits + batch poll) | ~2 s (20 ms suite) |
| Offline by default | yes (netns-proven) | yes (netns-proven) |
| Failure message quality | good | good |
| Rubric (observed) total | **117 / 159** | **137 / 159** |

Weights (design-note Task 3 rubric; scale 0–3, max 159; source: `~/Documents/personal-development/thoughts/shared/research/2026-09-06-ai-eval-design-note.md`): setup 4, runner 5, offline 5, deterministic 5, judge 4, trajectory 4, mcp 3, providers 3, dataset 4, baseline 4, ci 5, cost 3, health 2, language 2. Per-dimension observed scores with reasons: `promptfoo-notes.md` / `evalite-notes.md`.

Key observed deltas: evalite runs **inside the repo with zero fixture infrastructure** (pure modules — nothing to boot, 20 ms suite, jest untouched byte-for-byte); promptfoo proves the **real HTTP contract** (Express routes, SSRF refusals, rate limiter, batch failure recording, SSE phase order, recommendation shape through the actual analyzer+stub stack) but needs a launcher, two stubs, a canned site and four app children to stay offline. Both caught their deliberately introduced regressions.

## Pick

**evalite** (137 vs 117 observed). For a first quality gate that runs on every change, evalite's suite is the one developers will actually keep green: no infrastructure to boot, 20 ms runtime, jest completely untouched, and its decision tables pin the exact behavior this repo most needs locked — grade boundaries, weight normalization, the analyzer's mandatory-`recommendations` contract (the only field that throws), `repairJson` leniency, and provider selection. It caught the grade-boundary drift (`>= 90` → `>= 98`) with the exact data case named.

**Runner-up:** promptfoo — switch to it (or, better, adopt its suite as a second layer) when the goal shifts from module behavior to the wire contract: `/api/audit` response shape, SSRF/rate-limit enforcement, batch failure recording and SSE phase ordering are only visible over HTTP, and its trial branch already contains that suite, launcher and CI job ready to re-enable.

## Trials stopped early

None — both trials produced green + red runs inside the time-box.

## What the final branch carries

`evals/evalite`: the cleaned in-process suite (8 evals / 24 data cases + skipped judge case), the `test:evals:vitest` script, the evals CI job, `docs/evals.md`, and this folder (survey, per-trial notes and run logs, comparison).
