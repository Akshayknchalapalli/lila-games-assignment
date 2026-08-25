"""T012 — no Event in a MatchDetail violates the canonical Event invariant."""

from pathlib import Path

from pipeline.src.diagnostics import DiagnosticsSink
from pipeline.src.index import match_detail_payload
from pipeline.src.normalize import normalize_file
from pipeline.src.reconstruct import reconstruct_matches
from pipeline.tests.conftest import EVENT_KINDS, HUMAN_UUID, MATCH_A
from pipeline.tests.parquet_util import write_journey

CANONICAL_ACTORS = {"human", "bot"}
CANONICAL_MAPS = {"AmbroseValley", "GrandRift", "Lockdown"}


def test_match_detail_events_are_canonical_only(tmp_path: Path) -> None:
    path = tmp_path / "February_10" / f"{HUMAN_UUID}_{MATCH_A}"
    write_journey(
        path,
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("Position", 0.0, 1.0, 0.0, 5), ("Explosion", 1.0, 1.0, 1.0, 6)],
    )
    sink = DiagnosticsSink()
    events = normalize_file(path, collection_day="February_10", diagnostics=sink).events
    matches = reconstruct_matches(events)
    detail = match_detail_payload(matches[MATCH_A])
    assert detail is not None
    assert all(e["eventKind"] in EVENT_KINDS for e in detail["events"])
    assert all(e["actorKind"] in CANONICAL_ACTORS for e in detail["events"])
    assert all(e["mapId"] in CANONICAL_MAPS for e in detail["events"])
    assert all("ts" in e and isinstance(e["ts"], (int, float)) for e in detail["events"])
    assert not any(e.get("eventKind") == "unknown" for e in detail["events"])
    assert not any(e.get("actorKind") == "unknown" for e in detail["events"])
    assert sink.unknown_events == 1
