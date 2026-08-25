"""Read-only inspection of player_data/ (plan Phase 0).

Notes here are observations, not guesses. Findings that belong in
ARCHITECTURE.md are listed in INSPECTION_FINDINGS_FOR_DOCS.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

# T006/T007 — recorded after opening representative extensionless files.
INSPECTION_NOTES = """
Schema (representative files via pyarrow):
  user_id: string
  match_id: string
  map_id: string
  x, y, z: float
  ts: timestamp[ms]  — match-relative; values look like 1970-01-21
  event: binary (UTF-8 names such as Position)

Files:
  No .parquet suffix; still valid Apache Parquet.
  Five day folders: February_10 … February_14 (February_14 partial).
  Filename: {user_id}_{match_id}.nakama-0

Unreadable-file policy:
  Skip the file, increment filesSkipped, record skipReasons, continue.
  Do not abort the build. Do not delete sibling journeys in the same match.
"""

INSPECTION_FINDINGS_FOR_DOCS = [
    "Extensionless files are valid Parquet (pyarrow).",
    "event is binary/bytes; decode UTF-8 before classification.",
    "ts physical type is timestamp[ms]; semantically match-relative, not calendar.",
    "collectionDay is the folder name, never ts.",
    "February_14 is a partial day (folder + README).",
    "Human user_id is UUID 8-4-4-4-12; bot user_id is entirely digits.",
    "Three maps: AmbroseValley, GrandRift, Lockdown; minimaps 1024×1024.",
    "Original minimaps are 3–12 MB and MUST NOT ship; pipeline writes compressed copies.",
    "Unreadable files are skipped and counted (filesSkipped), not ignored silently.",
]


def inspect_source(source: Path, sample_per_day: int = 1) -> dict[str, Any]:
    """Read-only sample of player_data. Does not write artifacts."""
    import pyarrow.parquet as pq

    source = Path(source)
    days = sorted(
        p for p in source.iterdir() if p.is_dir() and p.name.startswith("February_")
    )
    samples: list[dict[str, Any]] = []
    for day in days:
        files = [p for p in day.iterdir() if p.is_file()][:sample_per_day]
        for path in files:
            try:
                parquet_file = pq.ParquetFile(path)
                schema = parquet_file.schema_arrow
                ts_field = schema.field("ts")
                event_field = schema.field("event")
                table = parquet_file.read(columns=["event", "ts"]).slice(0, 1)
                event_val = table.column("event")[0].as_py()
                samples.append(
                    {
                        "file": str(path.relative_to(source)),
                        "rows": parquet_file.metadata.num_rows,
                        "tsType": str(ts_field.type),
                        "eventType": str(event_field.type),
                        "eventSample": (
                            event_val.decode("utf-8")
                            if isinstance(event_val, (bytes, bytearray))
                            else str(event_val)
                        ),
                    }
                )
            except Exception as exc:  # noqa: BLE001 — inspection must not abort
                samples.append({"file": str(path), "error": str(exc)})
    return {
        "days": [d.name for d in days],
        "notes": INSPECTION_NOTES.strip(),
        "findingsForDocs": INSPECTION_FINDINGS_FOR_DOCS,
        "samples": samples,
    }
