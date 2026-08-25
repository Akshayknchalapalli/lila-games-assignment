"""World → pixel projection using loaded MapConfig only (no local scale/origin table)."""

from __future__ import annotations

from typing import Any

from pipeline.src.map_config import UnknownMapError, map_by_id

__all__ = ["UnknownMapError", "world_to_pixel", "pixel_to_bin"]


def world_to_pixel(map_config: dict[str, Any], x: float, z: float) -> dict[str, Any]:
    if not map_config:
        raise UnknownMapError("mapConfig missing")
    map_id = map_config.get("mapId")
    if map_id:
        map_config = map_by_id(str(map_id))
    if "scale" not in map_config or "originX" not in map_config:
        raise UnknownMapError("mapConfig missing projection parameters")
    scale = float(map_config["scale"])
    origin_x = float(map_config["originX"])
    origin_z = float(map_config["originZ"])
    width = float(map_config["imageWidth"])
    height = float(map_config["imageHeight"])
    if scale == 0 or x != x or z != z:  # NaN
        raise ValueError("non-finite coordinates or zero scale")
    u = (x - origin_x) / scale
    v = (z - origin_z) / scale
    pixel_x = u * width
    pixel_y = (1 - v) * height
    in_bounds = 0 <= pixel_x < width and 0 <= pixel_y < height
    return {"pixelX": pixel_x, "pixelY": pixel_y, "inBounds": in_bounds}


def pixel_to_bin(pixel_x: float, pixel_y: float, *, columns: int = 64, rows: int = 64, image_size: float = 1024) -> tuple[int, int] | None:
    if not (0 <= pixel_x < image_size and 0 <= pixel_y < image_size):
        return None
    col = int(pixel_x / image_size * columns)
    row = int(pixel_y / image_size * rows)
    col = min(max(col, 0), columns - 1)
    row = min(max(row, 0), rows - 1)
    return col, row
