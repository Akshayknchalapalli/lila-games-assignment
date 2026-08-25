import type { CanonicalEvent, HeatmapGrid } from "../domain/types";
import { worldToPixel, type MapConfig } from "../domain/worldToPixel";
import { drawHeatmapOverlay } from "./heatmapLayer";
import { markerStyleFor, pathStyleFor } from "./visualLanguage";

function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shape: NonNullable<ReturnType<typeof markerStyleFor>>,
): void {
  const size = 6;
  ctx.save();
  ctx.fillStyle = shape.fill;
  ctx.strokeStyle = shape.stroke;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  switch (shape.shape) {
    case "triangle":
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y + size);
      ctx.lineTo(x - size, y + size);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      break;
    case "square":
      ctx.rect(x - size * 0.7, y - size * 0.7, size * 1.4, size * 1.4);
      break;
    case "circle":
      ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
      break;
    case "hex":
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case "x":
      ctx.moveTo(x - size, y - size);
      ctx.lineTo(x + size, y + size);
      ctx.moveTo(x + size, y - size);
      ctx.lineTo(x - size, y + size);
      ctx.stroke();
      ctx.restore();
      return;
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export type DrawWorld = {
  minimap: CanvasImageSource | null;
  mapConfig: MapConfig | null;
  events: CanonicalEvent[];
  heatmaps: Array<HeatmapGrid | null>;
};

export function drawWorld(ctx: CanvasRenderingContext2D, world: DrawWorld): void {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#121826";
  ctx.fillRect(0, 0, width, height);
  if (world.minimap) {
    ctx.drawImage(world.minimap, 0, 0, width, height);
  }
  for (const grid of world.heatmaps) {
    drawHeatmapOverlay(ctx, grid);
  }
  if (!world.mapConfig) return;

  const byActor = new Map<string, CanonicalEvent[]>();
  for (const event of world.events) {
    if (event.eventKind !== "Position" && event.eventKind !== "BotPosition") continue;
    const list = byActor.get(event.userId) ?? [];
    list.push(event);
    byActor.set(event.userId, list);
  }
  for (const list of byActor.values()) {
    const actorKind = list[0]!.actorKind;
    const style = pathStyleFor(actorKind);
    ctx.save();
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.setLineDash(style.dash);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    let started = false;
    for (const event of list) {
      const pix = worldToPixel(world.mapConfig, event.x, event.z);
      if (!started) {
        ctx.moveTo(pix.pixelX, pix.pixelY);
        started = true;
      } else {
        ctx.lineTo(pix.pixelX, pix.pixelY);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  for (const event of world.events) {
    const marker = markerStyleFor(event.eventKind);
    if (!marker) continue;
    const pix = worldToPixel(world.mapConfig, event.x, event.z);
    drawMarker(ctx, pix.pixelX, pix.pixelY, marker);
  }
}
