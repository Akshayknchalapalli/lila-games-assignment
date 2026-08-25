"""T008 — UTF-8 decode, UUID vs numeric actor, eight event names, unknown → quarantine."""

from pathlib import Path

from pipeline.src.diagnostics import DiagnosticsSink
from pipeline.src.normalize import normalize_file
from pipeline.tests.conftest import BOT_ID, EVENT_KINDS, HUMAN_UUID, MATCH_A
from pipeline.tests.parquet_util import write_journey


def test_utf8_event_decode_and_eight_canonical_kinds(tmp_path: Path) -> None:
    path = tmp_path / "February_10" / f"{HUMAN_UUID}_{MATCH_A}"
    events = [
        (kind, -301.45, 120.0, -355.55, 1000 * (i + 1))
        for i, kind in enumerate(EVENT_KINDS)
    ]
    write_journey(
        path,
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=events,
    )
    sink = DiagnosticsSink()
    result = normalize_file(path, collection_day="February_10", diagnostics=sink)
    kinds = [e["eventKind"] for e in result.events]
    assert kinds == list(EVENT_KINDS)
    assert all(e["actorKind"] in ("human", "bot") for e in result.events)
    assert sink.unknown_events == 0
    assert sink.quarantine == []


def test_uuid_is_human_numeric_is_bot(tmp_path: Path) -> None:
    human_path = tmp_path / "February_10" / f"{HUMAN_UUID}_{MATCH_A}"
    bot_path = tmp_path / "February_10" / f"{BOT_ID}_{MATCH_A}"
    write_journey(
        human_path,
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("Position", 0.0, 0.0, 0.0, 1)],
    )
    write_journey(
        bot_path,
        user_id=BOT_ID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("BotPosition", 1.0, 0.0, 1.0, 2)],
    )
    sink = DiagnosticsSink()
    human = normalize_file(human_path, collection_day="February_10", diagnostics=sink)
    bot = normalize_file(bot_path, collection_day="February_10", diagnostics=sink)
    assert human.events[0]["actorKind"] == "human"
    assert bot.events[0]["actorKind"] == "bot"


def test_unknown_actor_event_map_become_quarantine_not_event(tmp_path: Path) -> None:
    day = tmp_path / "February_10"
    unknown_actor = day / f"not-uuid-or-digits_{MATCH_A}"
    unknown_event = day / f"{HUMAN_UUID}_{MATCH_A}-event"
    unknown_map = day / f"{HUMAN_UUID}_{MATCH_A}-map"
    write_journey(
        unknown_actor,
        user_id="not-uuid-or-digits",
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("Position", 0.0, 0.0, 0.0, 1)],
    )
    write_journey(
        unknown_event,
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("Explosion", 0.0, 0.0, 0.0, 1)],
    )
    write_journey(
        unknown_map,
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="MoonBase",
        events=[("Position", 0.0, 0.0, 0.0, 1)],
    )
    sink = DiagnosticsSink()
    a = normalize_file(unknown_actor, collection_day="February_10", diagnostics=sink)
    e = normalize_file(unknown_event, collection_day="February_10", diagnostics=sink)
    m = normalize_file(unknown_map, collection_day="February_10", diagnostics=sink)
    assert a.events == []
    assert e.events == []
    assert m.events == []
    reasons = {row["reason"] for row in sink.quarantine}
    assert reasons == {"unknown_actor", "unknown_event", "unknown_map"}
    assert sink.unknown_actors == 1
    assert sink.unknown_events == 1
    assert sink.unknown_maps == 1
    for row in [*a.events, *e.events, *m.events]:
        assert row.get("eventKind") != "unknown"
        assert row.get("actorKind") != "unknown"
