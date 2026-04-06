import { describe, expect, it } from "vite-plus/test";
import { getSwitchMetrics, getSwitchThumbOffset } from "../src/components/switch/variants.ts";

describe("getSwitchMetrics", () => {
  it("md track is wider than sm", () => {
    expect(getSwitchMetrics("md").trackW).toBeGreaterThan(getSwitchMetrics("sm").trackW);
  });
});

describe("getSwitchThumbOffset", () => {
  it("checked thumb moves right", () => {
    const offUnchecked = getSwitchThumbOffset("md", false);
    const offChecked = getSwitchThumbOffset("md", true);
    expect(offChecked).toBeGreaterThan(offUnchecked);
  });
});
