import type { CanonicalEvent } from "../domain/types";
import { worldToPixel, type MapConfig } from "../domain/worldToPixel";

type Point = { x: number; y: number };

function perpDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / length;
}

function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i += 1) {
    const dist = perpDistance(points[i]!, points[0]!, points[end]!);
    if (dist > maxDist) {
      index = i;
      maxDist = dist;
    }
  }
  if (maxDist > epsilon) {
    const left = simplify(points.slice(0, index + 1), epsilon);
    const right = simplify(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0]!, points[end]!];
}

export function simplifyMovement(
  events: CanonicalEvent[],
  mapConfig: MapConfig,
  epsilon = 1.5,
): CanonicalEvent[] {
  const movement = events.filter(
    (e) => e.eventKind === "Position" || e.eventKind === "BotPosition",
  );
  const discrete = events.filter(
    (e) => e.eventKind !== "Position" && e.eventKind !== "BotPosition",
  );
  const byActor = new Map<string, CanonicalEvent[]>();
  for (const event of movement) {
    const list = byActor.get(event.userId) ?? [];
    list.push(event);
    byActor.set(event.userId, list);
  }
  const kept = new Set<CanonicalEvent>();
  for (const list of byActor.values()) {
    const points = list.map((event) => {
      const pix = worldToPixel(mapConfig, event.x, event.z);
      return { x: pix.pixelX, y: pix.pixelY, event };
    });
    const simplified = simplify(
      points.map((p) => ({ x: p.x, y: p.y })),
      epsilon,
    );
    const wanted = new Set(simplified.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`));
    for (const point of points) {
      const key = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
      if (wanted.has(key) || point === points[0] || point === points[points.length - 1]) {
        kept.add(point.event);
      }
    }
  }
  return [...kept, ...discrete].sort((a, b) => a.ts - b.ts || a.userId.localeCompare(b.userId));
}
