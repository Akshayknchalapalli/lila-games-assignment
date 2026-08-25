"""Emit index.json and per-match MatchDetail JSON. Embed MapConfig from the canonical contract."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pipeline.src.map_config import load_maps

TS_UNIT = "ms"
DAY_IDS = (
    "February_10",
    "February_11",
    "February_12",
    "February_13",
    "February_14",
)


def _day_label(day_id: str) -> str:
    pretty = day_id.replace("_", " ")
    if day_id == "February_14":
        return f"{pretty} (partial)"
    return pretty


def match_detail_payload(match: dict[str, Any]) -> dict[str, Any] | None:
    if match.get("status") != "ready":
        return None
    return {
        "matchId": match["matchId"],
        "mapId": match["mapId"],
        "collectionDay": match["collectionDay"],
        "humanCount": match["humanCount"],
        "botCount": match["botCount"],
        "tsMin": match["tsMin"],
        "tsMax": match["tsMax"],
        "tsUnit": match["tsUnit"],
        "events": match["events"],
    }


def detail_relpath(match_id: str) -> str:
    safe = match_id.replace("/", "_")
    return f"matches/{safe}.json"


def write_match_details(matches: dict[str, dict[str, Any]], out_dir: Path) -> list[dict[str, Any]]:
    match_dir = out_dir / "matches"
    match_dir.mkdir(parents=True, exist_ok=True)
    index_rows: list[dict[str, Any]] = []
    for match_id, match in sorted(matches.items()):
        payload = match_detail_payload(match)
        if payload is None:
            continue
        rel = detail_relpath(match_id)
        (out_dir / rel).write_text(json.dumps(payload), encoding="utf-8")
        index_rows.append(
            {
                "matchId": match_id,
                "mapId": match["mapId"],
                "collectionDay": match["collectionDay"],
                "humanCount": match["humanCount"],
                "botCount": match["botCount"],
                "eventCount": len(match["events"]),
                "tsMin": match["tsMin"],
                "tsMax": match["tsMax"],
                "detailPath": rel,
            }
        )
    return index_rows


def write_index(
    *,
    out_dir: Path,
    matches: list[dict[str, Any]],
    load_report: dict[str, Any],
) -> dict[str, Any]:
    maps = []
    for row in load_maps():
        maps.append(
            {
                "mapId": row["mapId"],
                "displayName": row["displayName"],
                "scale": row["scale"],
                "originX": row["originX"],
                "originZ": row["originZ"],
                "imageWidth": row["imageWidth"],
                "imageHeight": row["imageHeight"],
                "assetPath": f"minimaps/{row['mapId']}.webp",
            }
        )
    present_days = {m["collectionDay"] for m in matches}
    days = []
    for day_id in DAY_IDS:
        if day_id in present_days or True:
            days.append(
                {
                    "dayId": day_id,
                    "partialDay": day_id == "February_14",
                    "label": _day_label(day_id),
                }
            )
    index = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "tsUnit": TS_UNIT,
        "loadReport": load_report,
        "days": days,
        "maps": maps,
        "matches": matches,
    }
    (out_dir / "index.json").write_text(json.dumps(index), encoding="utf-8")
    return index
