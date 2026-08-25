# LILA BLACK — Player Journey Visualization

Hosted Level-Designer tool for inspecting production journeys on the three LILA BLACK minimaps. The browser never reads Parquet. A Python pipeline writes canonical JSON; the Vite app consumes `index.json`, per-match details, 64×64 heatmap bins, and compressed minimaps.

## Stack

| Layer | Choice |
|-------|--------|
| Pipeline | Python 3.11+ (`pyarrow`, Pillow, pytest) |
| Web | TypeScript, Vite, React, Canvas 2D, Vitest |
| Host | Static site (Vercel or Netlify) |

## Setup

From `lila-assigment/` (this folder):

```text
pip install -e pipeline[dev]
cd web && npm install && cd ..
python -m pipeline.build --source player_data --out web/public/data --minimaps-out web/public/minimaps
cd web
npm test
npm run dev
```

Open http://localhost:5173. Default landing: Ambrose Valley + February 10, match unselected.

### Environment

- Python 3.11+
- Node.js 20+
- `player_data/` with `February_10`…`February_14` and `minimaps/`

No API keys. No auth. Projection parameters come from `specs/001-player-journey-viz/contracts/map-config.json` (embedded into `index.json`). Do not hardcode scale/origin.

## Public URL

**Public URL:** [https://lila-games-assignment-one.vercel.app/](https://lila-games-assignment-one.vercel.app/)

That is the Quality Gate 9 link. Deploy from `lila-assigment/web` on branch `dev` (Vite). Regenerating data:

```text
cd web
npx vercel --prod
```

## Tests

```text
python -m pytest pipeline/tests -q
cd web && npx vitest run
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md). Design notes from the data: [INSIGHTS.md](./INSIGHTS.md).

Open the [public URL](https://lila-games-assignment-one.vercel.app/) and walk map placement, human/bot paths, event markers, map/day/match filters, playback, and the three heatmap toggles.
