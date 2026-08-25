"""T024 — 64×64 heatmap bins from canonical Events only."""

from pipeline.src.heatmap import BIN_COUNT, build_grid
from pipeline.src.reconstruct import reconstruct_matches

HUMAN = "f4e072fa-b7af-4761-b567-1d95b7ad0108"
BOT = "1440"
MATCH = "heatmap-match.nakama-0"


def _event(kind: str, x: float, z: float, user: str = HUMAN, actor: str = "human"):
    return {
        "userId": user,
        "actorKind": actor,
        "matchId": MATCH,
        "mapId": "AmbroseValley",
        "collectionDay": "February_10",
        "x": x,
        "y": 100.0,
        "z": z,
        "ts": 1,
        "eventKind": kind,
        "sourceFile": "fixture",
    }


def test_grid_shape_maxcount_and_grain() -> None:
    events = [
        _event("Position", -301.45, -355.55),
        _event("BotPosition", -301.45, -355.55, user=BOT, actor="bot"),
        _event("Kill", -301.45, -355.55),
        _event("Loot", -301.45, -355.55),
    ]
    traffic = build_grid(
        overlay="traffic",
        map_id="AmbroseValley",
        events=events,
        day_id="February_10",
        match_id=None,
    )
    assert traffic["columns"] == 64
    assert traffic["rows"] == 64
    assert len(traffic["counts"]) == 4096 == BIN_COUNT
    assert traffic["maxCount"] == max(traffic["counts"])
    assert traffic["dayId"] == "February_10"
    assert traffic["matchId"] is None
    assert traffic["maxCount"] == 2

    kill = build_grid(
        overlay="kill",
        map_id="AmbroseValley",
        events=events,
        day_id=None,
        match_id=MATCH,
    )
    assert kill["dayId"] is None
    assert kill["matchId"] == MATCH
    assert kill["maxCount"] == 1

    death = build_grid(
        overlay="death",
        map_id="AmbroseValley",
        events=events,
        day_id="February_10",
        match_id=None,
    )
    assert death["maxCount"] == 0
    assert death["maxCount"] == max(death["counts"])


def test_loot_and_quarantine_excluded() -> None:
    events = [
        _event("Loot", -301.45, -355.55),
        _event("KilledByStorm", -301.45, -355.55),
    ]
    traffic = build_grid(
        overlay="traffic",
        map_id="AmbroseValley",
        events=events,
        day_id="February_10",
        match_id=None,
    )
    death = build_grid(
        overlay="death",
        map_id="AmbroseValley",
        events=events,
        day_id="February_10",
        match_id=None,
    )
    assert traffic["maxCount"] == 0
    assert death["maxCount"] == 1
    matches = reconstruct_matches(events)
    assert MATCH in matches
    assert all(e["eventKind"] != "unknown" for e in matches[MATCH]["events"])


def test_grain_xor_rejected() -> None:
    try:
        build_grid(
            overlay="traffic",
            map_id="AmbroseValley",
            events=[],
            day_id="February_10",
            match_id=MATCH,
        )
        ok = False
    except ValueError:
        ok = True
    assert ok
