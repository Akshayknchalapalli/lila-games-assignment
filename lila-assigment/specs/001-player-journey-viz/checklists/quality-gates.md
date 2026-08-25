# Quality Gates 1–9 — Player Journey Visualization

Recorded 2026-08-25 against local pipeline + Vite build. Hosted FC7 repeat is listed separately.

| Gate | Result | Evidence |
|------|--------|----------|
| 1 Pipeline boundary | PASS | `web/src` has no Parquet dependency; `loadIndex` fetches `/data/index.json` |
| 2 Projection | PASS | pytest `test_projection.py` + vitest `worldToPixel.test.ts` vs `map-config.json` testVectors |
| 3 Canonical events | PASS | pytest normalize/canonical/reconstruct; unknown → quarantine |
| 4 Filters / days | PASS | vitest `filters.test.ts`; February 14 `partialDay: true` in index.json |
| 5 Playback | PASS | vitest playhead + `measureAdvanceFps` ≥ 30 |
| 6 Heatmaps | PASS | pytest `test_heatmap.py` 64×64/4096; vitest rasterize 4096 counts |
| 7 First paint / perf | PASS (local) | First effect loads index+diagnostics only; heatmap raster < 16 ms; playback advance ≥ 30 FPS |
| 8 Docs | PASS | README.md, ARCHITECTURE.md, INSIGHTS.md |
| 9 Hosted URL | PASS | https://lila-games-assignment-one.vercel.app/ |

## Quickstart §§1–7

1. `python -m pytest pipeline/tests -q` — 18 passed; `python -m pipeline.build` wrote index (795 matches, 1243 filesSeen, diagnostics.json always present).
2. Projection tests pass on canonical vectors (Ambrose interior ≈ (78, 890); origin (0, 1024) `inBounds: false`).
3. Reconstruction tests pass (join, sort, quarantine isolation, conflict → error).
4. `npx vitest run` — domain/viz contract tests.
5. Local UI: `cd web && npm run dev` — default Ambrose Valley + February 10.
6. FC7 local: index-first fetch; heatmap bin raster on 64×64; playhead advance budget met.
7. Hosted: deploy `web/dist` including `data/` and `minimaps/`; repeat §5–6 on the public URL.

## FC7 hosted repeat

Repeat first-paint (index + minimap only), filter swap, playback FPS, and 64×64 heatmap replacement on the URL in README.md after production deploy.
