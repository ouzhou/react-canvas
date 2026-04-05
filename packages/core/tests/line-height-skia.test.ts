import { describe, expect, it } from "vite-plus/test";
import { lineHeightToSkHeightMultiplier } from "../src/paragraph-build.ts";

describe("lineHeightToSkHeightMultiplier", () => {
  it("treats CSS-like unitless multipliers (≤4) as Skia heightMultiplier", () => {
    expect(lineHeightToSkHeightMultiplier(1.45, 15)).toBe(1.45);
    expect(lineHeightToSkHeightMultiplier(1.25, 22)).toBe(1.25);
  });

  it("treats larger values as absolute px / fontSize", () => {
    expect(lineHeightToSkHeightMultiplier(22, 15)).toBeCloseTo(22 / 15);
    expect(lineHeightToSkHeightMultiplier(36, 24)).toBeCloseTo(1.5);
  });
});
