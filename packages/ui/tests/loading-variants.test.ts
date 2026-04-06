import { describe, expect, it } from "vite-plus/test";
import { getLoadingMetrics } from "../src/components/loading/variants.ts";

describe("getLoadingMetrics", () => {
  it("lg icon is larger than md and sm", () => {
    expect(getLoadingMetrics("lg").iconSize).toBeGreaterThan(getLoadingMetrics("md").iconSize);
    expect(getLoadingMetrics("md").iconSize).toBeGreaterThan(getLoadingMetrics("sm").iconSize);
  });

  it("matches Ant Design–style dot sizes (14 / 20 / 32)", () => {
    expect(getLoadingMetrics("sm").iconSize).toBe(14);
    expect(getLoadingMetrics("md").iconSize).toBe(20);
    expect(getLoadingMetrics("lg").iconSize).toBe(32);
  });
});
