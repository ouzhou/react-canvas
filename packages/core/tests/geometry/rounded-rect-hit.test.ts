import { describe, expect, it } from "vite-plus/test";
import { pointInRoundedRectLocal } from "../../src/geometry/rounded-rect-hit.ts";

describe("pointInRoundedRectLocal", () => {
  it("interior and corners of square with radius", () => {
    expect(pointInRoundedRectLocal(50, 50, 100, 100, 10)).toBe(true);
    expect(pointInRoundedRectLocal(5, 5, 100, 100, 10)).toBe(true);
    expect(pointInRoundedRectLocal(2, 2, 100, 100, 10)).toBe(false);
    expect(pointInRoundedRectLocal(0.5, 0.5, 100, 100, 10)).toBe(false);
  });

  it("circle: w=h=100 r=50", () => {
    expect(pointInRoundedRectLocal(50, 50, 100, 100, 50)).toBe(true);
    expect(pointInRoundedRectLocal(0, 0, 100, 100, 50)).toBe(false);
  });

  it("r=0 is axis rect", () => {
    expect(pointInRoundedRectLocal(0, 0, 10, 10, 0)).toBe(true);
    expect(pointInRoundedRectLocal(10, 10, 10, 10, 0)).toBe(false);
  });
});
