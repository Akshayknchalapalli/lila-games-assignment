import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyFilterChange,
  defaultFilterState,
  matchesForFilter,
} from "../domain/filters";
import {
  isPartialData,
  loadDiagnostics,
  loadIndex,
  loadMatchDetail,
} from "../domain/indexLoader";
import { dayHeatmapUrl, loadHeatmap, matchHeatmapUrl } from "../domain/heatmapLoader";
import {
  clampPlayhead,
  disabledPlayhead,
  playheadForMatch,
  visibleEvents,
  type PlayheadState,
} from "../domain/playhead";
import type {
  FilterState,
  HeatmapGrid,
  HeatmapOverlay,
  MatchDetail,
  MatchIndex,
} from "../domain/types";
import { resolveMapConfig } from "../domain/worldToPixel";
import { drawWorld } from "../viz/mapCanvas";
import { simplifyMovement } from "../viz/pathSimplify";
import { startPlayback } from "../viz/playback";
import { EmptyErrorStates } from "./EmptyErrorStates";
import { FilterBar } from "./FilterBar";
import { HeatmapToggles } from "./HeatmapToggles";
import { PartialDataBanner } from "./PartialDataBanner";
import { Timeline } from "./Timeline";

const EMPTY_TOGGLES: Record<HeatmapOverlay, boolean> = {
  traffic: false,
  kill: false,
  death: false,
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<PlayheadState>(disabledPlayhead());
  const [index, setIndex] = useState<MatchIndex | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>(defaultFilterState());
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [playhead, setPlayhead] = useState<PlayheadState>(disabledPlayhead());
  const [toggles, setToggles] = useState(EMPTY_TOGGLES);
  const [heatmaps, setHeatmaps] = useState<Record<HeatmapOverlay, HeatmapGrid | null>>({
    traffic: null,
    kill: null,
    death: null,
  });
  const [minimap, setMinimap] = useState<HTMLImageElement | null>(null);
  const [fps, setFps] = useState<number | null>(null);

  playheadRef.current = playhead;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [payload, diagnostics] = await Promise.all([
          loadIndex("/data/index.json"),
          loadDiagnostics("/data/diagnostics.json"),
        ]);
        if (cancelled) return;
        if (diagnostics?.loadReport && !payload.loadReport.filesSeen) {
          payload.loadReport = { ...payload.loadReport, ...diagnostics.loadReport };
        }
        setIndex(payload);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "index load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mapConfig = useMemo(() => {
    if (!index || !filter.mapId) return null;
    try {
      return resolveMapConfig(index.maps, filter.mapId);
    } catch {
      return null;
    }
  }, [index, filter.mapId]);

  useEffect(() => {
    if (!mapConfig?.assetPath) {
      setMinimap(null);
      return;
    }
    const image = new Image();
    image.onload = () => setMinimap(image);
    image.src = mapConfig.assetPath.startsWith("/")
      ? mapConfig.assetPath
      : `/${mapConfig.assetPath}`;
  }, [mapConfig]);

  const subset = index ? matchesForFilter(index, filter) : [];
  const emptySubset = Boolean(index) && subset.length === 0;

  useEffect(() => {
    if (!index || !filter.matchId) {
      setDetail(null);
      setMatchError(null);
      setPlayhead(disabledPlayhead());
      return;
    }
    const row = index.matches.find((m) => m.matchId === filter.matchId);
    if (!row) {
      setDetail(null);
      setMatchError("Match is not in the index.");
      setPlayhead(disabledPlayhead());
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    loadMatchDetail(row.detailPath)
      .then((payload) => {
        if (cancelled) return;
        if (payload.mapId !== filter.mapId) {
          setDetail(null);
          setMatchError("Match map does not match the selected map. No stand-in map will be used.");
          setPlayhead(disabledPlayhead());
          return;
        }
        setDetail(payload);
        setMatchError(null);
        setPlayhead(playheadForMatch(payload.matchId, payload.tsMin, payload.tsMax));
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
          setMatchError("This match could not be reconstructed.");
          setPlayhead(disabledPlayhead());
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [index, filter.matchId, filter.mapId]);

  useEffect(() => {
    let cancelled = false;
    const overlays: HeatmapOverlay[] = ["traffic", "kill", "death"];
    const urls = overlays.map((overlay) =>
      filter.matchId && !emptySubset
        ? matchHeatmapUrl(filter.matchId, overlay)
        : filter.mapId && filter.dayId
          ? dayHeatmapUrl(filter.mapId, filter.dayId, overlay)
          : null,
    );
    Promise.all(
      urls.map(async (url) => {
        if (!url) return null;
        try {
          return await loadHeatmap(url);
        } catch {
          return null;
        }
      }),
    ).then((grids) => {
      if (cancelled) return;
      setHeatmaps({
        traffic: grids[0],
        kill: grids[1],
        death: grids[2],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [filter.matchId, filter.mapId, filter.dayId, emptySubset]);

  useEffect(() => {
    const handle = startPlayback(
      () => playheadRef.current,
      (next) => setPlayhead(next),
      setFps,
    );
    return () => handle.stop();
  }, []);

  const visible = useMemo(() => {
    if (!detail || playhead.t == null) return [];
    const sliced = visibleEvents(detail.events, playhead.t);
    return mapConfig ? simplifyMovement(sliced, mapConfig) : sliced;
  }, [detail, playhead.t, mapConfig]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const activeHeatmaps = (Object.keys(toggles) as HeatmapOverlay[])
      .filter((key) => toggles[key])
      .map((key) => heatmaps[key]);
    if (emptySubset || matchError) {
      drawWorld(ctx, { minimap, mapConfig, events: [], heatmaps: [] });
      return;
    }
    drawWorld(ctx, {
      minimap,
      mapConfig,
      events: visible,
      heatmaps: activeHeatmaps,
    });
  }, [visible, minimap, mapConfig, toggles, heatmaps, emptySubset, matchError]);

  const onFilter = (patch: Partial<FilterState>) => {
    if (!index) return;
    setFilter((current) => applyFilterChange(current, patch, index));
    setToggles(EMPTY_TOGGLES);
  };

  const viewKind =
    !index && !loadError
      ? "loading"
      : loadError
        ? "error"
        : emptySubset
          ? "empty"
          : matchError
            ? "error"
            : "idle";

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>LILA BLACK — Player Journeys</h1>
          <p>Level-designer view of production matches. Canonical JSON only — no Parquet in the browser.</p>
        </div>
        {fps != null && playhead.playing ? (
          <span className="fps">{Math.round(fps)} FPS</span>
        ) : null}
      </header>
      <PartialDataBanner report={index?.loadReport} />
      {index ? <FilterBar index={index} filter={filter} onChange={onFilter} /> : null}
      <HeatmapToggles
        enabled={toggles}
        empty={{
          traffic: heatmaps.traffic?.maxCount === 0,
          kill: heatmaps.kill?.maxCount === 0,
          death: heatmaps.death?.maxCount === 0,
        }}
        onToggle={(overlay) =>
          setToggles((current) => ({ ...current, [overlay]: !current[overlay] }))
        }
      />
      <div className="stage">
        <canvas ref={canvasRef} width={1024} height={1024} aria-label="Minimap canvas" />
        <aside className="legend">
          <h2>Visual language</h2>
          <ul>
            <li><span className="swatch human" /> Human path</li>
            <li><span className="swatch bot" /> Bot path</li>
            <li>Kill / killed / bot kill / bot killed / loot / storm each have a unique marker</li>
          </ul>
          {isPartialData(index?.loadReport) ? (
            <p>Unknown actor/event/map rows stay in quarantine and are never drawn as markers.</p>
          ) : null}
        </aside>
        <EmptyErrorStates
          kind={viewKind}
          message={loadError ?? matchError ?? undefined}
        />
        {detailLoading ? <EmptyErrorStates kind="loading" message="Loading match detail…" /> : null}
      </div>
      <Timeline
        playhead={playhead}
        onToggle={() =>
          setPlayhead((current) =>
            current.matchId ? { ...current, playing: !current.playing } : current,
          )
        }
        onSeek={(t) =>
          setPlayhead((current) =>
            current.tsMin != null && current.tsMax != null
              ? { ...current, t: clampPlayhead(t, current.tsMin, current.tsMax), playing: false }
              : current,
          )
        }
      />
    </div>
  );
}
