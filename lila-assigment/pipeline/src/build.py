"""CLI: python -m pipeline.build --source player_data --out web/public/data"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pipeline.src.assets import compress_minimaps
from pipeline.src.diagnostics import DiagnosticsSink
from pipeline.src.heatmap import write_heatmaps
from pipeline.src.index import write_index, write_match_details
from pipeline.src.normalize import COLLECTION_DAYS, normalize_file
from pipeline.src.reconstruct import reconstruct_matches


def run_build(*, source: Path, out: Path, minimap_out: Path | None = None) -> DiagnosticsSink:
    source = Path(source)
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    sink = DiagnosticsSink()
    events: list[dict] = []

    for day_dir in sorted(p for p in source.iterdir() if p.is_dir()):
        if day_dir.name not in COLLECTION_DAYS:
            continue
        for path in sorted(day_dir.iterdir()):
            if not path.is_file():
                continue
            result = normalize_file(
                path,
                collection_day=day_dir.name,
                diagnostics=sink,
                source_root=source,
            )
            events.extend(result.events)

    matches = reconstruct_matches(events)
    index_rows = write_match_details(matches, out)
    write_heatmaps(matches, out)
    load_report = sink.load_report(quarantine_path="diagnostics.json")
    write_index(out_dir=out, matches=index_rows, load_report=load_report)
    sink.write(out / "diagnostics.json")

    dest_minimaps = minimap_out if minimap_out is not None else out.parent / "minimaps"
    compress_minimaps(source / "minimaps", dest_minimaps)
    return sink


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Build canonical player-journey artifacts")
    parser.add_argument("--source", default="player_data")
    parser.add_argument("--out", default="web/public/data")
    parser.add_argument("--minimaps-out", default="web/public/minimaps")
    args = parser.parse_args(argv)
    run_build(source=Path(args.source), out=Path(args.out), minimap_out=Path(args.minimaps_out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
