"""64×64 heatmap bins from canonical Events only."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any

from pipeline.src.map_config import map_by_id
from pipeline.src.project import pixel_to_bin, world_to_pixel

COLUMNS = 64
ROWS = 64
BIN_COUNT = COLUMNS * ROWS

TRAFFIC = frozenset({"Position", "BotPosition"})
KILL = frozenset({"Kill", "BotKill"})
DEATH = frozenset({"Killed", "BotKilled", "KilledByStorm"})
OVERLAYS = {
    "traffic": TRAFFIC,
    "kill": KILL,
    "death": DEATH,
}


def empty_counts() -> list[int]:
    return [0] * BIN_COUNT


def increment(counts: list[int], event: dict[str, Any]) -> None:
    cfg = map_by_id(event["mapId"])
    pix = world_to_pixel(cfg, event["x"], event["z"])
    bin_xy = pixel_to_bin(pix["pixelX"], pix["pixelY"], columns=COLUMNS, rows=ROWS, image_size=cfg["imageWidth"])
    if bin_xy is None:
        return
    col, row = bin_xy
    counts[row * COLUMNS + col] += 1


def build_grid(
    *,
    overlay: str,
    map_id: str,
    events: list[dict[str, Any]],
    day_id: str | None,
    match_id: str | None,
) -> dict[str, Any]:
    if (day_id is None) == (match_id is None):
        raise ValueError("heatmap grain must be day XOR match")
    kinds = OVERLAYS[overlay]
    counts = empty_counts()
    for event in events:
        if event["eventKind"] not in kinds:
            continue
        if event["mapId"] != map_id:
            continue
        increment(counts, event)
    max_count = max(counts) if counts else 0
    return {
        "overlay": overlay,
        "mapId": map_id,
        "dayId": day_id,
        "matchId": match_id,
        "columns": COLUMNS,
        "rows": ROWS,
        "counts": counts,
        "maxCount": max_count,
    }


def write_heatmaps(matches: dict[str, dict[str, Any]], out_dir: Path) -> None:
    day_events: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for match in matches.values():
        if match.get("status") != "ready":
            continue
        events = match["events"]
        map_id = match["mapId"]
        day_id = match["collectionDay"]
        match_id = match["matchId"]
        day_events[(map_id, day_id)].extend(events)
        match_dir = out_dir / "heatmaps" / "match" / match_id.replace("/", "_")
        match_dir.mkdir(parents=True, exist_ok=True)
        for overlay in OVERLAYS:
            grid = build_grid(
                overlay=overlay,
                map_id=map_id,
                events=events,
                day_id=None,
                match_id=match_id,
            )
            (match_dir / f"{overlay}.json").write_text(json.dumps(grid), encoding="utf-8")

    for (map_id, day_id), events in day_events.items():
        day_dir = out_dir / "heatmaps" / "day" / map_id / day_id
        day_dir.mkdir(parents=True, exist_ok=True)
        for overlay in OVERLAYS:
            grid = build_grid(
                overlay=overlay,
                map_id=map_id,
                events=events,
                day_id=day_id,
                match_id=None,
            )
            (day_dir / f"{overlay}.json").write_text(json.dumps(grid), encoding="utf-8")
