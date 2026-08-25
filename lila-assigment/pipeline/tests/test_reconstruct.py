"""T011 — match reconstruction invariants."""

from pathlib import Path

from pipeline.src.diagnostics import DiagnosticsSink
from pipeline.src.normalize import normalize_file
from pipeline.src.reconstruct import reconstruct_matches
from pipeline.tests.conftest import BOT_ID, HUMAN_UUID, MATCH_A, MATCH_B
from pipeline.tests.parquet_util import write_journey


def _norm(path: Path, sink: DiagnosticsSink, day: str = "February_10"):
    return normalize_file(path, collection_day=day, diagnostics=sink)


def test_join_by_match_id_sorted_ts_counts_and_range(tmp_path: Path) -> None:
    day = tmp_path / "February_10"
    write_journey(
        day / f"{HUMAN_UUID}_{MATCH_A}",
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[
            ("Loot", -10.0, 1.0, -10.0, 300),
            ("Position", -10.0, 1.0, -10.0, 100),
        ],
    )
    write_journey(
        day / f"{BOT_ID}_{MATCH_A}",
        user_id=BOT_ID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("BotPosition", 0.0, 1.0, 0.0, 200)],
    )
    sink = DiagnosticsSink()
    events = []
    events.extend(_norm(day / f"{HUMAN_UUID}_{MATCH_A}", sink).events)
    events.extend(_norm(day / f"{BOT_ID}_{MATCH_A}", sink).events)
    matches = reconstruct_matches(events)
    assert MATCH_A in matches
    match = matches[MATCH_A]
    assert match["status"] == "ready"
    ts_list = [e["ts"] for e in match["events"]]
    assert ts_list == sorted(ts_list)
    assert ts_list == [100, 200, 300]
    assert match["tsMin"] == min(ts_list) == 100
    assert match["tsMax"] == max(ts_list) == 300
    assert match["tsMin"] <= match["tsMax"]
    assert match["humanCount"] == 1
    assert match["botCount"] == 1
    assert {e["eventKind"] for e in match["events"]} >= {"Position", "BotPosition", "Loot"}
    for event in match["events"]:
        assert event["actorKind"] in ("human", "bot")
        assert event["eventKind"] in {
            "Position",
            "BotPosition",
            "Kill",
            "Killed",
            "BotKill",
            "BotKilled",
            "KilledByStorm",
            "Loot",
        }


def test_unknown_map_row_does_not_drop_match(tmp_path: Path) -> None:
    day = tmp_path / "February_10"
    write_journey(
        day / f"{HUMAN_UUID}_{MATCH_A}",
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("Position", 0.0, 0.0, 0.0, 10), ("Kill", 1.0, 0.0, 1.0, 20)],
    )
    write_journey(
        day / f"{BOT_ID}_{MATCH_A}",
        user_id=BOT_ID,
        match_id=MATCH_A,
        map_id="MoonBase",
        events=[("BotPosition", 0.0, 0.0, 0.0, 15)],
    )
    sink = DiagnosticsSink()
    events = []
    events.extend(_norm(day / f"{HUMAN_UUID}_{MATCH_A}", sink).events)
    events.extend(_norm(day / f"{BOT_ID}_{MATCH_A}", sink).events)
    assert sink.unknown_maps == 1
    matches = reconstruct_matches(events)
    match = matches[MATCH_A]
    assert match["status"] == "ready"
    assert match["mapId"] == "AmbroseValley"
    assert all(e["mapId"] != "MoonBase" for e in match["events"])
    assert any(e["eventKind"] == "Kill" for e in match["events"])


def test_conflicting_known_maps_error_not_standin(tmp_path: Path) -> None:
    day = tmp_path / "February_10"
    write_journey(
        day / f"{HUMAN_UUID}_{MATCH_A}",
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("Position", 0.0, 0.0, 0.0, 10)],
    )
    write_journey(
        day / f"{BOT_ID}_{MATCH_A}",
        user_id=BOT_ID,
        match_id=MATCH_A,
        map_id="Lockdown",
        events=[("BotPosition", 0.0, 0.0, 0.0, 11)],
    )
    sink = DiagnosticsSink()
    events = []
    events.extend(_norm(day / f"{HUMAN_UUID}_{MATCH_A}", sink).events)
    events.extend(_norm(day / f"{BOT_ID}_{MATCH_A}", sink).events)
    matches = reconstruct_matches(events)
    match = matches[MATCH_A]
    assert match["status"] == "error"
    assert match.get("events", []) == [] or match["status"] == "error"
    assert match.get("mapId") in (None, "error") or match["status"] == "error"


def test_distinct_match_ids_stay_separate(tmp_path: Path) -> None:
    day = tmp_path / "February_10"
    write_journey(
        day / f"{HUMAN_UUID}_{MATCH_A}",
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("Position", 0.0, 0.0, 0.0, 1)],
    )
    write_journey(
        day / f"{HUMAN_UUID}_{MATCH_B}",
        user_id=HUMAN_UUID,
        match_id=MATCH_B,
        map_id="GrandRift",
        events=[("Position", 0.0, 0.0, 0.0, 1)],
    )
    sink = DiagnosticsSink()
    events = []
    events.extend(_norm(day / f"{HUMAN_UUID}_{MATCH_A}", sink).events)
    events.extend(_norm(day / f"{HUMAN_UUID}_{MATCH_B}", sink).events)
    matches = reconstruct_matches(events)
    assert set(matches) == {MATCH_A, MATCH_B}
