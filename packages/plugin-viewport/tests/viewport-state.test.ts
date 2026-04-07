import { describe, expect, it } from "vitest";
import { clampViewportScale, panViewport, zoomAtViewportPoint } from "../src/viewport-state.ts";

describe("viewport-state", () => {
  it("clampViewportScale", () => {
    expect(clampViewportScale(0.01)).toBe(0.1);
    expect(clampViewportScale(100)).toBe(8);
    expect(clampViewportScale(2)).toBe(2);
  });

  it("panViewport", () => {
    expect(panViewport({ translateX: 1, translateY: 2, scale: 1 }, 3, 4).translateX).toBe(4);
  });

  it("zoomAtViewportPoint keeps focal at origin when focal is 0,0", () => {
    const s0 = { translateX: 0, translateY: 0, scale: 1 };
    const s1 = zoomAtViewportPoint(s0, 2, 0, 0);
    expect(s1.scale).toBe(2);
    expect(s1.translateX).toBe(0);
    expect(s1.translateY).toBe(0);
  });

  it("zoomAtViewportPoint adjusts translate for nonzero focal", () => {
    const s0 = { translateX: 0, translateY: 0, scale: 1 };
    const s1 = zoomAtViewportPoint(s0, 2, 100, 100);
    expect(s1.scale).toBe(2);
    expect(s1.translateX).toBe(-100);
    expect(s1.translateY).toBe(-100);
  });
});
