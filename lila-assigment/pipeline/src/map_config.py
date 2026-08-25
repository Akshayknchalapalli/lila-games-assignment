"""Load projection parameters from the canonical MapConfig contract.

Do not duplicate scale/origin/image-size literals here. The only source of
truth is specs/001-player-journey-viz/contracts/map-config.json.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

KNOWN_MAP_IDS = ("AmbroseValley", "GrandRift", "Lockdown")

_REPO_ROOT = Path(__file__).resolve().parents[2]
CANONICAL_MAP_CONFIG_PATH = (
    _REPO_ROOT / "specs" / "001-player-journey-viz" / "contracts" / "map-config.json"
)


class UnknownMapError(LookupError):
    """Unknown mapId: fail closed, never substitute another map's origin/scale."""


def canonical_map_config_path() -> Path:
    return CANONICAL_MAP_CONFIG_PATH


@lru_cache(maxsize=1)
def load_map_config_file(path: Path | None = None) -> dict[str, Any]:
    config_path = path or CANONICAL_MAP_CONFIG_PATH
    if not config_path.is_file():
        raise FileNotFoundError(f"Canonical MapConfig missing: {config_path}")
    with config_path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if "maps" not in data or "imageWidth" not in data or "imageHeight" not in data:
        raise ValueError("map-config.json is missing maps or image size")
    return data


def load_maps(path: Path | None = None) -> list[dict[str, Any]]:
    data = load_map_config_file(path)
    width = data["imageWidth"]
    height = data["imageHeight"]
    maps: list[dict[str, Any]] = []
    for row in data["maps"]:
        maps.append(
            {
                "mapId": row["mapId"],
                "displayName": row["displayName"],
                "scale": row["scale"],
                "originX": row["originX"],
                "originZ": row["originZ"],
                "imageWidth": width,
                "imageHeight": height,
            }
        )
    return maps


def map_by_id(map_id: str, path: Path | None = None) -> dict[str, Any]:
    for row in load_maps(path):
        if row["mapId"] == map_id:
            return row
    raise UnknownMapError(f"Unknown mapId: {map_id}")


def known_map_ids(path: Path | None = None) -> frozenset[str]:
    return frozenset(row["mapId"] for row in load_maps(path))


def test_vectors(path: Path | None = None) -> list[dict[str, Any]]:
    return list(load_map_config_file(path)["testVectors"])
