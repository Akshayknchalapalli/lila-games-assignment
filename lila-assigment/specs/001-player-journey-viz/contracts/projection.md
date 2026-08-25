# Projection contract

**Implementing**: Principle II + Quality Gate 2  
**Authoritative parameters**: `map-config.json` (this directory) is the single source of truth for scale, origin, and image size — not an executable function. Pipeline and web MUST load it. Python and TypeScript each implement the formula below and MUST pass `testVectors`. Do not copy scale/origin into language-specific constants.

**Consumed by**: Python heatmap binning (world → pixel → bin at build time); TypeScript `worldToPixel(mapConfig, x, z)` for canvas draw of world coordinates.

## Function (UI / domain)

```
worldToPixel(mapConfig, x, z) → { pixelX, pixelY, inBounds }
```

- `mapConfig` is the matching row from `map-config.json` (embedded in `index.json`).
- `y` MUST NOT be a parameter.
- Unknown `mapId` MUST throw / return an error result. MUST NOT use another map's origin or scale.
- `inBounds` describes the projected pixel location. An out-of-bounds coordinate is still projected and returned; consumers MUST decide whether to render, clamp, or reject per their contract (spec: explicit out-of-range, not clip without notice).

## Map table

The table below is documentation of `map-config.json`, not a second source of truth.

| mapId | scale | originX | originZ |
|-------|-------|---------|---------|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |

Image size is 1024×1024. V is flipped:

```
u = (x - originX) / scale
v = (z - originZ) / scale
pixelX = u * 1024
pixelY = (1 - v) * 1024
inBounds = (0 ≤ pixelX < 1024) ∧ (0 ≤ pixelY < 1024)
```

## Required tests

Pytest and Vitest MUST load `testVectors` from `map-config.json` (pixel values within ±1 px) and assert each vector's `inBounds`. Do not re-type the numbers in test source except by reading that file. Origin-boundary vectors project to `(0, 1024)` with `inBounds: false`; the formula MUST NOT clamp `pixelY` to 1023 to force a true flag.

## Failure behavior

Unknown map, missing config, or non-finite x/z → explicit error. Never silent fallback.
