# SoberAI brand assets

Source of truth: [`sober-ai-logo.svg`](./sober-ai-logo.svg) — a hand-drawn
lighthouse whose beam dissolves into circuit nodes ("Lighthouse for the AI
Age"). Palette follows the app: `#0a0a0a` field, `#4ade80` beam,
`#1a73e8` tower bands.

Regenerate every derived PNG (web, extension, store) from the SVG:

```bash
npm run brand:icons
```

Outputs: `icons/icon-{16,48,128,180}.png` here, plus the extension copies
under `extension/icons/`. Never hand-edit a PNG — edit the SVG and re-run.
