import { describe, expect, it } from "vite-plus/test";
import { getAvatarGroupRingStyle } from "../src/components/avatar/variants.ts";
import { defaultAlgorithm } from "../src/theme/algorithms.ts";
import { DEFAULT_SEED } from "../src/theme/seed.ts";
import { getCanvasToken } from "../src/theme/get-canvas-token.ts";

describe("getAvatarGroupRingStyle", () => {
  it("light token uses white ring", () => {
    const token = defaultAlgorithm(DEFAULT_SEED);
    const s = getAvatarGroupRingStyle(token);
    expect(s.borderWidth).toBe(2);
    expect(s.borderColor).toBe("#ffffff");
  });

  it("dark token uses layout background ring", () => {
    const token = getCanvasToken({ appearance: "dark", seed: DEFAULT_SEED });
    const s = getAvatarGroupRingStyle(token);
    expect(s.borderColor).toBe(token.colorBgLayout);
  });
});
