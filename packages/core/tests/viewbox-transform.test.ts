import { describe, expect, it } from "vite-plus/test";
import { parseViewBox, viewBoxToAffine } from "../src/viewbox-transform.ts";

describe("parseViewBox", () => {
  it("parses space-separated four numbers", () => {
    expect(parseViewBox("0 0 24 24")).toEqual({
      minX: 0,
      minY: 0,
      width: 24,
      height: 24,
    });
  });

  it("parses comma-separated", () => {
    expect(parseViewBox("0,0,24,24")).toEqual({
      minX: 0,
      minY: 0,
      width: 24,
      height: 24,
    });
  });

  it("returns null for invalid viewBox", () => {
    expect(parseViewBox("0 0 -1 24")).toBeNull();
    expect(parseViewBox("")).toBeNull();
    expect(parseViewBox("0 0 24")).toBeNull();
  });
});

describe("viewBoxToAffine", () => {
  it("scales 24x24 viewBox to 48x48 layout (centered)", () => {
    const vb = { minX: 0, minY: 0, width: 24, height: 24 };
    const { scale, translateX, translateY } = viewBoxToAffine(vb, 48, 48);
    expect(scale).toBe(2);
    expect(translateX).toBe(0);
    expect(translateY).toBe(0);
  });

  it("letterboxes when layout aspect differs", () => {
    const vb = { minX: 0, minY: 0, width: 24, height: 24 };
    const { scale, translateX, translateY } = viewBoxToAffine(vb, 48, 24);
    expect(scale).toBe(1);
    expect(translateX).toBe(12);
    expect(translateY).toBe(0);
  });

  it("respects non-zero minX minY", () => {
    const vb = { minX: 10, minY: 10, width: 14, height: 14 };
    const { scale, translateX, translateY } = viewBoxToAffine(vb, 24, 24);
    expect(scale).toBeCloseTo(24 / 14, 5);
    const exp = (-10 * 24) / 14;
    expect(translateX).toBeCloseTo(exp, 5);
    expect(translateY).toBeCloseTo(exp, 5);
  });
});
