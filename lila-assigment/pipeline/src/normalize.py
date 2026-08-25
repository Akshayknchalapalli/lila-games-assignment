"""Raw row → canonical Event or QuarantineRecord. Never coerce unknown into Event."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from pipeline.src.diagnostics import DiagnosticsSink
from pipeline.src.map_config import known_map_ids

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
DIGIT_RE = re.compile(r"^\d+$")
EVENT_KINDS = frozenset(
    {
        "Position",
        "BotPosition",
        "Kill",
        "Killed",
        "BotKill",
        "BotKilled",
        "KilledByStorm",
        "Loot",
    }
)
EXPECTED_TS_UNIT = "ms"
COLLECTION_DAYS = frozenset(
    {
        "February_10",
        "February_11",
        "February_12",
        "February_13",
        "February_14",
    }
)


@dataclass
class NormalizeResult:
    events: list[dict[str, Any]] = field(default_factory=list)
    skipped: bool = False


def classify_actor(user_id: str) -> str | None:
    if UUID_RE.fullmatch(user_id):
        return "human"
    if DIGIT_RE.fullmatch(user_id):
        return "bot"
    return None


def decode_event(raw: Any) -> str | None:
    if isinstance(raw, (bytes, bytearray, memoryview)):
        try:
            return bytes(raw).decode("utf-8")
        except UnicodeDecodeError:
            return None
    if isinstance(raw, str):
        return raw
    return None


def _ts_unit(field_type: pa.DataType) -> str | None:
    if pa.types.is_timestamp(field_type):
        return field_type.unit
    return None


def _as_ms(value: Any, unit: str) -> float | None:
    if value is None:
        return None
    if hasattr(value, "timestamp"):
        return float(value.timestamp() * 1000)
    if isinstance(value, (int, float)):
        if unit == "ms":
            return float(value)
        if unit == "us":
            return float(value) / 1000.0
        if unit == "ns":
            return float(value) / 1_000_000.0
        if unit == "s":
            return float(value) * 1000.0
        return float(value)
    return None


def normalize_file(
    path: Path,
    *,
    collection_day: str,
    diagnostics: DiagnosticsSink,
    source_root: Path | None = None,
) -> NormalizeResult:
    diagnostics.note_file_seen()
    rel = str(path.relative_to(source_root)) if source_root else str(path)
    maps = known_map_ids()
    try:
        parquet_file = pq.ParquetFile(path)
        schema = parquet_file.schema_arrow
        ts_field = schema.field("ts")
        ts_unit = _ts_unit(ts_field.type)
        table = parquet_file.read()
        if ts_unit == EXPECTED_TS_UNIT:
            idx = schema.get_field_index("ts")
            table = table.set_column(idx, "ts", table.column("ts").cast(pa.int64()))
    except Exception as exc:  # noqa: BLE001 — unreadable file is counted, not fatal
        diagnostics.add_unreadable(rel, str(exc))
        return NormalizeResult(skipped=True)

    events: list[dict[str, Any]] = []
    columns = {name: table.column(name) for name in table.column_names}
    n = table.num_rows
    ts_mismatch = ts_unit != EXPECTED_TS_UNIT

    for i in range(n):
        user_id = str(columns["user_id"][i].as_py())
        match_id = str(columns["match_id"][i].as_py())
        map_id = str(columns["map_id"][i].as_py())
        raw_event = columns["event"][i].as_py()
        event_name = decode_event(raw_event)
        event_raw = (
            event_name
            if event_name is not None
            else (raw_event.decode("latin-1", errors="replace") if isinstance(raw_event, (bytes, bytearray)) else str(raw_event))
        )
        x = float(columns["x"][i].as_py())
        y = float(columns["y"][i].as_py())
        z = float(columns["z"][i].as_py())
        ts_py = columns["ts"][i].as_py()

        if ts_mismatch:
            diagnostics.add_row(
                "ts_unit_mismatch",
                rel,
                user_id=user_id,
                match_id=match_id,
                map_id=map_id,
                event_raw=event_raw,
            )
            continue

        ts_ms = _as_ms(ts_py, ts_unit or EXPECTED_TS_UNIT)
        if ts_ms is None or not (ts_ms == ts_ms):  # NaN check
            diagnostics.add_row(
                "ts_unit_mismatch",
                rel,
                user_id=user_id,
                match_id=match_id,
                map_id=map_id,
                event_raw=event_raw,
            )
            continue

        actor = classify_actor(user_id)
        if actor is None:
            diagnostics.add_row(
                "unknown_actor",
                rel,
                user_id=user_id,
                match_id=match_id,
                map_id=map_id,
                event_raw=event_raw,
            )
            continue

        if event_name is None or event_name not in EVENT_KINDS:
            diagnostics.add_row(
                "unknown_event",
                rel,
                user_id=user_id,
                match_id=match_id,
                map_id=map_id,
                event_raw=event_raw,
            )
            continue

        if map_id not in maps:
            diagnostics.add_row(
                "unknown_map",
                rel,
                user_id=user_id,
                match_id=match_id,
                map_id=map_id,
                event_raw=event_raw,
            )
            continue

        events.append(
            {
                "userId": user_id,
                "actorKind": actor,
                "matchId": match_id,
                "mapId": map_id,
                "collectionDay": collection_day,
                "x": x,
                "y": y,
                "z": z,
                "ts": ts_ms,
                "eventKind": event_name,
                "sourceFile": rel,
            }
        )

    return NormalizeResult(events=events, skipped=False)
