from __future__ import annotations

import pyarrow as pa
import pyarrow.parquet as pq


def write_journey(
    path,
    *,
    user_id: str,
    match_id: str,
    map_id: str,
    events: list[tuple[str, float, float, float, int]],
    ts_type: str = "ms",
) -> None:
    """events: (event_name, x, y, z, ts_ms)."""
    names, xs, ys, zs, tss = zip(*events) if events else ([], [], [], [], [])
    event_col = pa.array([n.encode("utf-8") for n in names], type=pa.binary())
    if ts_type == "ms":
        ts_col = pa.array(list(tss), type=pa.timestamp("ms"))
    elif ts_type == "us":
        ts_col = pa.array([t * 1000 for t in tss], type=pa.timestamp("us"))
    else:
        ts_col = pa.array(list(tss), type=pa.int64())
    table = pa.table(
        {
            "user_id": pa.array([user_id] * len(names), type=pa.string()),
            "match_id": pa.array([match_id] * len(names), type=pa.string()),
            "map_id": pa.array([map_id] * len(names), type=pa.string()),
            "x": pa.array(list(xs), type=pa.float32()),
            "y": pa.array(list(ys), type=pa.float32()),
            "z": pa.array(list(zs), type=pa.float32()),
            "ts": ts_col,
            "event": event_col,
        }
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(table, path)
