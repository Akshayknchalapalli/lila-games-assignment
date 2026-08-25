"""T009 — projection tests load testVectors from canonical map-config.json."""

import json
from math import isfinite

from pipeline.src.map_config import canonical_map_config_path, map_by_id
from pipeline.src.project import UnknownMapError, world_to_pixel
from pipeline.tests.conftest import CANONICAL_MAP_CONFIG


def test_vectors_come_from_canonical_contract_not_hardcoded_literals() -> None:
    assert canonical_map_config_path() == CANONICAL_MAP_CONFIG
    with CANONICAL_MAP_CONFIG.open(encoding="utf-8") as handle:
        data = json.load(handle)
    vectors = data["testVectors"]
    assert vectors, "testVectors must exist on the canonical contract"
    for vector in vectors:
        cfg = map_by_id(vector["mapId"])
        result = world_to_pixel(cfg, vector["x"], vector["z"])
        assert abs(result["pixelX"] - vector["pixelX"]) <= 1
        assert abs(result["pixelY"] - vector["pixelY"]) <= 1
        assert result["inBounds"] is vector["inBounds"]
        # Origin vectors are (0, 1024) with inBounds false — do not clamp pixelY to 1023.
        if vector["pixelX"] == 0 and vector["pixelY"] == 1024:
            assert result["pixelY"] == 1024 or abs(result["pixelY"] - 1024) <= 1
            assert result["inBounds"] is False
            assert result["pixelY"] != 1023


def test_ambrose_interior_in_bounds() -> None:
    with CANONICAL_MAP_CONFIG.open(encoding="utf-8") as handle:
        data = json.load(handle)
    interior = next(v for v in data["testVectors"] if v["inBounds"] is True)
    assert interior["mapId"] == "AmbroseValley"
    result = world_to_pixel(map_by_id("AmbroseValley"), interior["x"], interior["z"])
    assert result["inBounds"] is True
    assert abs(result["pixelX"] - 78) <= 1
    assert abs(result["pixelY"] - 890) <= 1


def test_unknown_map_fails_closed() -> None:
    try:
        world_to_pixel({"mapId": "MoonBase"}, 0.0, 0.0)
        raised = False
    except (UnknownMapError, KeyError, ValueError, LookupError):
        raised = True
    assert raised


def test_y_is_not_used_and_oob_is_not_clamped() -> None:
    cfg = map_by_id("AmbroseValley")
    origin = world_to_pixel(cfg, cfg["originX"], cfg["originZ"])
    assert isfinite(origin["pixelX"]) and isfinite(origin["pixelY"])
    assert origin["inBounds"] is False
    assert origin["pixelY"] >= 1024 or abs(origin["pixelY"] - 1024) <= 1e-6
