export type ActorKind = "human" | "bot";

export type EventKind =
  | "Position"
  | "BotPosition"
  | "Kill"
  | "Killed"
  | "BotKill"
  | "BotKilled"
  | "KilledByStorm"
  | "Loot";

export type MapId = "AmbroseValley" | "GrandRift" | "Lockdown";

export type DayId =
  | "February_10"
  | "February_11"
  | "February_12"
  | "February_13"
  | "February_14";

export type CanonicalEvent = {
  userId: string;
  actorKind: ActorKind;
  matchId: string;
  mapId: MapId;
  collectionDay: DayId;
  x: number;
  y: number;
  z: number;
  ts: number;
  eventKind: EventKind;
  sourceFile: string;
};

export type MatchDetail = {
  matchId: string;
  mapId: MapId;
  collectionDay: DayId;
  humanCount: number;
  botCount: number;
  tsMin: number;
  tsMax: number;
  tsUnit: string;
  events: CanonicalEvent[];
};

export type IndexMap = {
  mapId: MapId;
  displayName?: string;
  scale: number;
  originX: number;
  originZ: number;
  imageWidth: number;
  imageHeight: number;
  assetPath: string;
};

export type IndexMatch = {
  matchId: string;
  mapId: MapId;
  collectionDay: DayId;
  humanCount: number;
  botCount: number;
  eventCount?: number;
  tsMin: number;
  tsMax: number;
  detailPath: string;
};

export type LoadReport = {
  filesSeen: number;
  filesSkipped: number;
  skipReasons: Array<{ file: string; reason: string }>;
  unknownActors: number;
  unknownEvents: number;
  unknownMaps: number;
  quarantinePath?: string;
};

export type MatchIndex = {
  generatedAt: string;
  tsUnit: string;
  loadReport: LoadReport;
  days: Array<{ dayId: DayId; partialDay: boolean; label?: string }>;
  maps: IndexMap[];
  matches: IndexMatch[];
};

export type HeatmapOverlay = "traffic" | "kill" | "death";

export type HeatmapGrid = {
  overlay: HeatmapOverlay;
  mapId: MapId;
  dayId: DayId | null;
  matchId: string | null;
  columns: number;
  rows: number;
  counts: number[];
  maxCount: number;
};

export type FilterState = {
  mapId: MapId | null;
  dayId: DayId | null;
  matchId: string | null;
};

export const DEFAULT_MAP: MapId = "AmbroseValley";
export const DEFAULT_DAY: DayId = "February_10";
export const DISCRETE_EVENTS: EventKind[] = [
  "Kill",
  "Killed",
  "BotKill",
  "BotKilled",
  "Loot",
  "KilledByStorm",
];
