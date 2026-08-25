import { describe, expect, it } from "vitest";
import { clampPan, defaultViewport, panBy, zoomAt } from "./mapViewport";

describe("map viewport", () => {
  it("zooms toward a point and resets at 1x", () => {
    const zoomed = zoomAt(defaultViewport(), 2, 100, 80);
    expect(zoomed.scale).toBe(2);
    const out = zoomAt(zoomed, 0.5, 100, 80);
    expect(out.scale).toBe(1);
    expect(out.panX).toBe(0);
    expect(out.panY).toBe(0);
  });

  it("does not pan at 1x", () => {
    expect(panBy(defaultViewport(), 20, 10)).toEqual(defaultViewport());
  });

  it("keeps the map covering the frame when panned", () => {
    const view = clampPan({ scale: 2, panX: 50, panY: -900 }, 200, 100);
    expect(view.panX).toBe(0);
    expect(view.panY).toBe(-100);
  });
});
