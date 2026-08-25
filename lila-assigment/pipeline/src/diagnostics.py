"""Quarantine records and LoadReport counters (diagnostics.schema.json)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

QUARANTINE_REASONS = (
    "unreadable_file",
    "unknown_actor",
    "unknown_event",
    "unknown_map",
    "ts_unit_mismatch",
)


@dataclass
class DiagnosticsSink:
    files_seen: int = 0
    files_skipped: int = 0
    skip_reasons: list[dict[str, str]] = field(default_factory=list)
    unknown_actors: int = 0
    unknown_events: int = 0
    unknown_maps: int = 0
    quarantine: list[dict[str, Any]] = field(default_factory=list)

    def note_file_seen(self) -> None:
        self.files_seen += 1

    def add_unreadable(self, source_file: str, reason: str) -> None:
        self.files_skipped += 1
        self.skip_reasons.append({"file": source_file, "reason": reason})
        self.quarantine.append(
            {"reason": "unreadable_file", "sourceFile": source_file}
        )

    def add_row(
        self,
        reason: str,
        source_file: str,
        *,
        user_id: str | None = None,
        match_id: str | None = None,
        map_id: str | None = None,
        event_raw: str | None = None,
    ) -> None:
        if reason not in QUARANTINE_REASONS:
            raise ValueError(f"invalid quarantine reason: {reason}")
        if reason == "unknown_actor":
            self.unknown_actors += 1
        elif reason == "unknown_event":
            self.unknown_events += 1
        elif reason == "unknown_map":
            self.unknown_maps += 1
        row: dict[str, Any] = {"reason": reason, "sourceFile": source_file}
        if user_id is not None:
            row["userId"] = user_id
        if match_id is not None:
            row["matchId"] = match_id
        if map_id is not None:
            row["mapId"] = map_id
        if event_raw is not None:
            row["eventRaw"] = event_raw
        self.quarantine.append(row)

    def load_report(self, *, quarantine_path: str | None = None) -> dict[str, Any]:
        report: dict[str, Any] = {
            "filesSeen": self.files_seen,
            "filesSkipped": self.files_skipped,
            "skipReasons": list(self.skip_reasons),
            "unknownActors": self.unknown_actors,
            "unknownEvents": self.unknown_events,
            "unknownMaps": self.unknown_maps,
        }
        if quarantine_path is not None:
            report["quarantinePath"] = quarantine_path
        return report

    def document(self) -> dict[str, Any]:
        """diagnostics.json body — no quarantinePath."""
        return {"loadReport": self.load_report(), "quarantine": list(self.quarantine)}

    def write(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.document(), indent=2), encoding="utf-8")
