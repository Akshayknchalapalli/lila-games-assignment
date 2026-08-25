"""Reconstruct matches from valid canonical Events only."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

TS_UNIT = "ms"


def reconstruct_matches(events: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        grouped[event["matchId"]].append(event)

    matches: dict[str, dict[str, Any]] = {}
    for match_id, rows in grouped.items():
        rows_sorted = sorted(rows, key=lambda e: (e["ts"], e["userId"], e["eventKind"]))
        map_ids = {e["mapId"] for e in rows_sorted}
        days = {e["collectionDay"] for e in rows_sorted}
        if not rows_sorted or len(map_ids) != 1 or len(days) != 1:
            matches[match_id] = {
                "matchId": match_id,
                "status": "error",
                "events": [],
                "humanCount": 0,
                "botCount": 0,
                "tsMin": 0,
                "tsMax": 0,
                "tsUnit": TS_UNIT,
                "mapId": None,
                "collectionDay": None,
                "reason": "conflicting_or_empty",
            }
            continue
        map_id = next(iter(map_ids))
        collection_day = next(iter(days))
        ts_values = [e["ts"] for e in rows_sorted]
        humans = {e["userId"] for e in rows_sorted if e["actorKind"] == "human"}
        bots = {e["userId"] for e in rows_sorted if e["actorKind"] == "bot"}
        matches[match_id] = {
            "matchId": match_id,
            "status": "ready",
            "mapId": map_id,
            "collectionDay": collection_day,
            "events": rows_sorted,
            "humanCount": len(humans),
            "botCount": len(bots),
            "tsMin": min(ts_values),
            "tsMax": max(ts_values),
            "tsUnit": TS_UNIT,
        }
    return matches
