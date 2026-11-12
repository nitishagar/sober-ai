# Submission checklist — SoberAI Chrome extension (prep only, NOT submitted)

## Package contents (in-repo)

- [x] `extension/` — MV3, no build step, no remote code, no inline scripts
- [x] Icons 16/48/128 (+180) generated from `assets/brand/sober-ai-logo.svg`
- [x] Screenshots 1280×800 in `assets/store/` (regenerate: `npm run store:screenshots`)
- [x] Privacy policy: `docs/privacy.md` → publish at
  `https://nitishagar.github.io/sober-ai/#/privacy` before submitting
- [x] Listing text: `assets/store/listing.md`
- [x] Extension smoke-tested against the real backend (popup → SSE audit → report)

## Before you submit (owner actions)

1. Publish the docs site so the privacy URL is live; open it in an
   incognito window to confirm.
2. Decide the backend story for reviewers: the extension needs a reachable
   SoberAI backend. Either ship reviewer notes with a demo backend URL, or
   note "local backend required" in the review-notes field.
3. `npm run brand:icons` + `npm run store:screenshots` fresh (done), plus
   the ready upload zip: `assets/store/soberai-extension-0.4.0.zip`
   (rebuild after any extension change by re-zipping `extension/`).
4. Chrome Web Store developer account ($5 one-time) + review-notes text.

## Submission run (with passkey handoff)

1. Agent launches headed Chromium on this machine and pauses.
2. Owner completes passkey login in that window, then tells the agent to continue.
3. Agent fills the listing from `assets/store/listing.md`, uploads the zip
   + screenshots + icon, sets category/languages, and stops BEFORE the
   final publish click for owner review.
