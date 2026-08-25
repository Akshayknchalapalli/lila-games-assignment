"""T013 — filesSkipped vs row-level unknown*; diagnostics.json always written."""

import json
from pathlib import Path

from pipeline.src.build import run_build
from pipeline.src.diagnostics import DiagnosticsSink
from pipeline.src.normalize import normalize_file
from pipeline.tests.conftest import HUMAN_UUID, MATCH_A
from pipeline.tests.parquet_util import write_journey


def test_unreadable_file_increments_files_skipped_not_unknown_row_counters(
    tmp_path: Path,
) -> None:
    day = tmp_path / "February_10"
    day.mkdir()
    bad = day / f"{HUMAN_UUID}_{MATCH_A}"
    bad.write_bytes(b"this is not parquet")
    sink = DiagnosticsSink()
    result = normalize_file(bad, collection_day="February_10", diagnostics=sink)
    assert result.events == []
    assert result.skipped is True
    assert sink.files_skipped == 1
    assert sink.unknown_actors == 0
    assert sink.unknown_events == 0
    assert sink.unknown_maps == 0
    assert any(q["reason"] == "unreadable_file" for q in sink.quarantine)


def test_bad_row_increments_unknown_not_files_skipped(tmp_path: Path) -> None:
    path = tmp_path / "February_10" / f"{HUMAN_UUID}_{MATCH_A}"
    write_journey(
        path,
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="MoonBase",
        events=[("Position", 0.0, 0.0, 0.0, 1)],
    )
    sink = DiagnosticsSink()
    normalize_file(path, collection_day="February_10", diagnostics=sink)
    assert sink.files_skipped == 0
    assert sink.unknown_maps == 1


def test_diagnostics_json_always_written_including_clean_build(tmp_path: Path) -> None:
    source = tmp_path / "player_data"
    out = tmp_path / "out"
    day = source / "February_10"
    write_journey(
        day / f"{HUMAN_UUID}_{MATCH_A}",
        user_id=HUMAN_UUID,
        match_id=MATCH_A,
        map_id="AmbroseValley",
        events=[("Position", -301.45, 120.0, -355.55, 1000)],
    )
    (source / "minimaps").mkdir()
    run_build(source=source, out=out, minimap_out=tmp_path / "minimaps")
    diagnostics_path = out / "diagnostics.json"
    assert diagnostics_path.is_file()
    payload = json.loads(diagnostics_path.read_text(encoding="utf-8"))
    assert "loadReport" in payload
    assert "quarantine" in payload
    assert "quarantinePath" not in payload["loadReport"]
    report = payload["loadReport"]
    assert report["filesSkipped"] == 0
    assert report["unknownActors"] == 0
    assert report["unknownEvents"] == 0
    assert report["unknownMaps"] == 0
    assert report["filesSeen"] >= 1
