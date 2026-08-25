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
| 7 First paint / perf | PASS (local + hosted) | Hosted HTML 728 B; first paint assets: `index.json` 232 KB + Ambrose WebP 64 KB (not the match archive). Match detail and day traffic grid load on demand (337 KB / 13 KB sampled). |
| 8 Docs | PASS | README.md, ARCHITECTURE.md, INSIGHTS.md |
| 9 Hosted URL | PASS | https://lila-games-assignment-one.vercel.app/ |

## Quickstart §§1–7

1. `python -m pytest pipeline/tests -q` — 18 passed; `python -m pipeline.build` wrote index (795 matches, 1243 filesSeen, diagnostics.json always present).
2. Projection tests pass on canonical vectors (Ambrose interior ≈ (78, 890); origin (0, 1024) `inBounds: false`).
3. Reconstruction tests pass (join, sort, quarantine isolation, conflict → error).
4. `npx vitest run` — domain/viz contract tests.
5. Local UI: `cd web && npm run dev` — default Ambrose Valley + February 10.
6. FC7 local: index-first fetch; heatmap bin raster on 64×64; playhead advance budget met.
7. Hosted (2026-08-25): `https://lila-games-assignment-one.vercel.app/` — `/` 200, `/data/index.json` 200 (232576 B), `/minimaps/AmbroseValley.webp` 200 (64272 B). On-demand: match `ff73c97b-…d77c` 200 (337195 B); day traffic heatmap Ambrose/February_10 200 (13035 B, 64×64). Filter/playback/heatmap UI exercised locally; hosted payloads match the same JSON the Vite app fetches.

## FC7 hosted repeat

Recorded against https://lila-games-assignment-one.vercel.app/ (2026-08-25):

- First paint: document + index + minimap only (sizes above). Selecting a match then fetches one `matches/*.json`. Enabling Traffic on map+day fetches one 64×64 grid, not raw Position rows.
- Filter swap: index already contains map/day/match lists; no extra Parquet.
- Playback: same playhead code as local (`measureAdvanceFps` ≥ 30); hosted load of a 337 KB match is one GET.
- Heatmaps: day and match grids are pre-binned JSON (`counts.length` 4096).
