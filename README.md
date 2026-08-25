# LILA BLACK — Player Journey Visualization

LILA Games Product Engineer take-home: a hosted Level-Designer tool for production match journeys on Ambrose Valley, Grand Rift, and Lockdown.

**Live app:** [https://lila-games-assignment-one.vercel.app/](https://lila-games-assignment-one.vercel.app/)

The assignment code lives in [`lila-assigment/`](./lila-assigment/) (folder name kept as in the original project). GitHub only auto-renders this root `README.md`.

| Doc | Path |
|-----|------|
| Setup, stack, tests | [lila-assigment/README.md](./lila-assigment/README.md) |
| Pipeline, projection, assumptions | [lila-assigment/ARCHITECTURE.md](./lila-assigment/ARCHITECTURE.md) |
| Three evidenced findings | [lila-assigment/INSIGHTS.md](./lila-assigment/INSIGHTS.md) |

## Stack

| Layer | Choice |
|-------|--------|
| Pipeline | Python 3.11+ (`pyarrow`, Pillow, pytest) |
| Web | TypeScript, Vite, React, Canvas 2D, Vitest |
| Host | Vercel static site (`lila-assigment/web`) |

No API keys. No auth.

## Setup

```text
cd lila-assigment
pip install -e pipeline[dev]
cd web && npm install && cd ..
python -m pipeline.build --source player_data --out web/public/data --minimaps-out web/public/minimaps
cd web
npm test
npm run dev
```

Open http://localhost:5173. Default landing: Ambrose Valley + February 10, match unselected.

## Walkthrough (hosted)

On the [public URL](https://lila-games-assignment-one.vercel.app/): correct minimap placement, human vs bot paths, kill/death/loot/storm markers, map/day/match filters, playback, traffic/kill/death heatmaps.
