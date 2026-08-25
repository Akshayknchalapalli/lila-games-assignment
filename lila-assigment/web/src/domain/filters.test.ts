import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  applyFilterChange,
  defaultFilterState,
  isPartialDay,
  matchesForFilter,
} from "./filters";
import type { MatchIndex } from "./types";

const fixture: MatchIndex = {
  generatedAt: "2026-08-25T00:00:00Z",
  tsUnit: "ms",
  loadReport: {
    filesSeen: 2,
    filesSkipped: 0,
    skipReasons: [],
    unknownActors: 0,
    unknownEvents: 0,
    unknownMaps: 0,
    quarantinePath: "diagnostics.json",
  },
  days: [
    { dayId: "February_10", partialDay: false, label: "February 10" },
    { dayId: "February_14", partialDay: true, label: "February 14 (partial)" },
  ],
  maps: [
    {
      mapId: "AmbroseValley",
      scale: 900,
      originX: -370,
      originZ: -473,
      imageWidth: 1024,
      imageHeight: 1024,
      assetPath: "minimaps/AmbroseValley.webp",
    },
  ],
  matches: [
    {
      matchId: "m1.nakama-0",
      mapId: "AmbroseValley",
      collectionDay: "February_10",
      humanCount: 1,
      botCount: 0,
      tsMin: 1,
      tsMax: 2,
      detailPath: "matches/m1.json",
    },
    {
      matchId: "m2.nakama-0",
      mapId: "Lockdown",
      collectionDay: "February_10",
      humanCount: 1,
      botCount: 0,
      tsMin: 1,
      tsMax: 2,
      detailPath: "matches/m2.json",
    },
    {
      matchId: "m3.nakama-0",
      mapId: "AmbroseValley",
      collectionDay: "February_14",
      humanCount: 1,
      botCount: 0,
      tsMin: 1,
      tsMax: 2,
      detailPath: "matches/m3.json",
    },
  ],
};

describe("index loading / default selection (T028)", () => {
  it("defaults to Ambrose Valley + February 10 with match list from index.json only", () => {
    const filter = defaultFilterState();
    expect(filter.mapId).toBe("AmbroseValley");
    expect(filter.dayId).toBe("February_10");
    expect(filter.matchId).toBeNull();
    const list = matchesForFilter(fixture, filter);
    expect(list.map((m) => m.matchId)).toEqual(["m1.nakama-0"]);
    expect(list.every((m) => m.detailPath.endsWith(".json"))).toBe(true);
  });

  it("does not read Parquet from web/src (T004/T029 boundary)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const srcRoot = resolve(here, "..");
    const pkg = JSON.parse(
      readFileSync(resolve(here, "../../package.json"), "utf8"),
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(Object.keys(deps).join(" ").toLowerCase()).not.toMatch(/parquet|hyparquet/);
    expect(srcRoot.replaceAll("\\", "/")).toContain("/web/src");
  });
});

describe("filter semantics (T038)", () => {
  it("keys calendar off dayId not ts, labels February 14 partial, empty subset clears match", () => {
    expect(isPartialDay(fixture, "February_14")).toBe(true);
    expect(isPartialDay(fixture, "February_10")).toBe(false);
    const empty = applyFilterChange(
      defaultFilterState(),
      { mapId: "GrandRift" },
      fixture,
    );
    expect(matchesForFilter(fixture, empty)).toEqual([]);
    expect(empty.matchId).toBeNull();
    const withMatch = applyFilterChange(
      defaultFilterState(),
      { matchId: "m1.nakama-0" },
      fixture,
    );
    const cleared = applyFilterChange(withMatch, { dayId: "February_14" }, fixture);
    expect(cleared.matchId).toBeNull();
    expect(cleared.dayId).toBe("February_14");
  });
});
