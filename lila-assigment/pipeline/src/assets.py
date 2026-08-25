"""Compress original minimaps to 1024×1024 WebP in the web public tree."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

MAP_FILES = {
    "AmbroseValley": ("AmbroseValley_Minimap.png", "AmbroseValley_Minimap.jpg"),
    "GrandRift": ("GrandRift_Minimap.png", "GrandRift_Minimap.jpg"),
    "Lockdown": ("Lockdown_Minimap.jpg", "Lockdown_Minimap.png"),
}


def compress_minimaps(source_minimaps: Path, dest_dir: Path) -> list[Path]:
    dest_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    if not source_minimaps.is_dir():
        return written
    for map_id, candidates in MAP_FILES.items():
        src = None
        for name in candidates:
            candidate = source_minimaps / name
            if candidate.is_file():
                src = candidate
                break
        if src is None:
            continue
        with Image.open(src) as image:
            rgb = image.convert("RGB")
            resized = rgb.resize((1024, 1024), Image.Resampling.LANCZOS)
            out = dest_dir / f"{map_id}.webp"
            resized.save(out, "WEBP", quality=82, method=6)
            written.append(out)
    return written
