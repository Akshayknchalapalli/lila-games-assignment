import type { ActorKind, EventKind } from "../domain/types";

export type PathStyle = {
  stroke: string;
  lineWidth: number;
  dash: number[];
};

export type MarkerStyle = {
  fill: string;
  stroke: string;
  shape: "triangle" | "x" | "diamond" | "square" | "circle" | "hex";
};

export const HUMAN_PATH: PathStyle = {
  stroke: "#3ee0c4",
  lineWidth: 2.4,
  dash: [],
};

export const BOT_PATH: PathStyle = {
  stroke: "#f0a14a",
  lineWidth: 1.6,
  dash: [6, 4],
};

export const MARKERS: Record<Exclude<EventKind, "Position" | "BotPosition">, MarkerStyle> = {
  Kill: { fill: "#ff4d4d", stroke: "#fff5f5", shape: "triangle" },
  Killed: { fill: "#8b1e3f", stroke: "#ffd6e0", shape: "x" },
  BotKill: { fill: "#d946ef", stroke: "#f5d0fe", shape: "diamond" },
  BotKilled: { fill: "#7c3aed", stroke: "#ddd6fe", shape: "square" },
  Loot: { fill: "#fbbf24", stroke: "#fff7cc", shape: "circle" },
  KilledByStorm: { fill: "#38bdf8", stroke: "#e0f2fe", shape: "hex" },
};

export function pathStyleFor(actorKind: ActorKind): PathStyle {
  return actorKind === "human" ? HUMAN_PATH : BOT_PATH;
}

export function markerStyleFor(kind: EventKind): MarkerStyle | null {
  if (kind === "Position" || kind === "BotPosition") return null;
  return MARKERS[kind];
}

export const HEATMAP_COLORS: Record<"traffic" | "kill" | "death", [number, number, number]> = {
  traffic: [56, 189, 248],
  kill: [239, 68, 68],
  death: [168, 85, 247],
};
