# promptfoo trial notes — sober-ai (2026-09-06)

## Measured
- **Wall-clock setup time (install → first green run): ~55 min.** Install was fast; the time went to discovering three promptfoo mechanics (test→provider targeting via `providers: [label]`, `file://` providers being `new`-constructed, per-config basePath for file resolution) and one integration bug of our own (spawnSync freezing the stub servers — the highest-value lesson of the trial).
- **Configuration lines added:** ~410 measured (promptfoo.config.yaml 172 + probes.cjs 95 + launcher.mjs 180 + boot-app.mjs 25 + runner 100 + live yaml 45; some overlap in roles) + CI job 28.
- **Eval code/data lines added:** see config lines — cases are data; the launcher/probes are trial infra, not assertions.
- **Suite runtime:** ~11 s promptfoo (3 Playwright audits ≈ 3×3 s on loopback + batch poll ≈ 4 s + overhead), runner wall-clock ~15 s. Budget table target ≤90 s — beaten by ~6×.
- **Offline by default: YES** — netns-proven (`unshare -rn sh -c 'ip link set lo up && …'`; fresh netns ships with loopback DOWN — the proof command must raise it).
- **Failure message quality: good.** Case name + verbatim assertion in output; expected/actual in JSON export/viewer.
- **Surprises:** (1) spawnSync event-loop freeze (above) — a general lesson for any harness that hosts fixtures in-process; (2) the fresh-netns loopback-down gotcha; (3) `services.ollama: connected` proves the stub seam end-to-end through the app's own health contract; (4) the rate limiter needed its own app (`AUDIT_RATE_LIMIT` is read at module load) — the per-app child-process design paid off exactly as planned; (5) promptfoo's http provider passes non-2xx bodies through to assertions (400/429 cases assert on the JSON error body directly).

## Survey open questions answered
1. **Does committed `PROMPTFOO_CACHE_PATH` give truly zero-network runs incl. judges?** For the offline suite: yes (netns-proven, cache dir committed-ready, telemetry/update env disabled). Judge replay remains UNVERIFIED (no key) — first live run needs the key; unchanged cases replay from cache thereafter.
2. **Is an 11-case suite <2 min in CI?** Yes — ~15 s wall including app boot and 3 chromium audits.
3. **Do trajectory/JS assertions cover injection/denied-tool negatives without flaky judges?** Yes — SSRF-blocked, rate-limit, batch-failure and bad-payload negatives are all deterministic body assertions; no judge involvement.
6. **Is a separate eval script acceptable for the jest repo?** Yes in practice: `npm run test:evals` sits beside `test:ci`, jest is untouched, and CI gains one additive job. The cost is real but small (one extra command to keep green).

## Rubric re-score from observation (0–3; weights in comparison.md)
1. Setup 2 (three promptfoo mechanics + the launcher topology had to be learned)
2. Runner 0 (own CLI; sibling script + CI job)
3. Offline 2 (env gates + cache + netns proof; record/replay not first-class)
4. Deterministic 3 (body-level JS assertions everywhere; no model calls)
5. Judge 3 (pinned provider + temp 0 + rubricPrompt + cache in live yaml; not exercised live here)
6. Trajectory 1 (no MCP/tool-call trajectories in this shape; SSE order asserted via JS instead)
7. MCP 1 (no MCP surface in this repo — dimension largely N/A, scored low not zero because nothing was exercised)
8. Providers 3 (http provider drove the real app; provider-neutral by design)
9. Dataset 3 (YAML cases + JS assertions in git, diffable)
10. Baseline 3 (first-party before/after Action; not exercised)
11. CI 3 (exit codes + JSON output; additive job)
12. Cost 3 (MIT, free)
13. Health 3 (release 2026-08-28, ~14 committers/90d)
14. Language 3 (TypeScript-first, CJS-friendly providers)

**Weighted total (observed): 117 / 159** = Σ(score × weight) over the 14 dimensions above (weights 4,5,5,5,4,4,3,3,4,4,5,3,2,2; scale 0–3, max 159).

## Biggest risk of picking it
The eval topology (launcher + stubs + 4 app children) is real infrastructure to maintain, and it lives outside jest — the gate is only as good as the CI wiring that keeps it mandatory.
