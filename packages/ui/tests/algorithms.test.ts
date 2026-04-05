import { describe, expect, it } from "vite-plus/test";
import { compactAlgorithm, darkAlgorithm, defaultAlgorithm } from "../src/theme/algorithms.ts";
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
});
