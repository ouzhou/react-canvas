import { describe, expect, it } from "vite-plus/test";
import {
  compactAlgorithm,
  darkAlgorithm,
  defaultAlgorithm,
  lightenTowardsWhite,
} from "../src/theme/algorithms.ts";
import { getCanvasToken } from "../src/theme/get-canvas-token.ts";
import { DEFAULT_SEED } from "../src/theme/seed.ts";

describe("algorithms", () => {
  it("defaultAlgorithm fills layout from seed", () => {
    const t = defaultAlgorithm(DEFAULT_SEED);
    expect(t.colorPrimary).toBe(DEFAULT_SEED.colorPrimary);
    expect(t.borderRadius).toBe(DEFAULT_SEED.borderRadius);
    expect(t.paddingMD).toBeGreaterThan(0);
  });

  it("compactAlgorithm reduces padding vs base token", () => {
    const base = defaultAlgorithm(DEFAULT_SEED);
    const c = compactAlgorithm(base);
    expect(c.paddingMD).toBeDefined();
    expect(c.paddingMD!).toBeLessThan(base.paddingMD);
  });

  it("darkAlgorithm changes background vs light token", () => {
    const base = defaultAlgorithm(DEFAULT_SEED);
    const d = darkAlgorithm(base);
    expect(d.colorBgLayout).toBeDefined();
    expect(d.colorBgLayout).not.toBe(base.colorBgLayout);
    expect(d.colorPrimary).not.toBe(base.colorPrimary);
  });

  it("defaultAlgorithm sets lighter colorPrimaryHover than colorPrimary", () => {
    const t = defaultAlgorithm(DEFAULT_SEED);
    expect(t.colorPrimaryHover).toBe(lightenTowardsWhite(t.colorPrimary, 0.15));
    expect(t.colorBgHover).toBe("#fafafa");
  });

  it("dark theme primary hover is lighter than dark primary", () => {
    const t = getCanvasToken({ appearance: "dark" });
    const primary = t.colorPrimary;
    const hover = t.colorPrimaryHover;
    expect(hover).toBe(lightenTowardsWhite(primary, 0.1));
    expect(hover).not.toBe(primary);
  });
});
