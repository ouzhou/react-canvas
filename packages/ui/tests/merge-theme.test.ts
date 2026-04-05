import { describe, expect, it } from "vite-plus/test";
import { mergeThemeConfig } from "../src/theme/merge-config.ts";
import type { CanvasThemeConfig } from "../src/theme/types.ts";

describe("mergeThemeConfig", () => {
  it("child overrides appearance", () => {
    const parent: CanvasThemeConfig = { appearance: "light" };
    const child: CanvasThemeConfig = { appearance: "dark" };
    expect(mergeThemeConfig(parent, child).appearance).toBe("dark");
  });

  it("merges seed shallowly", () => {
    const parent: CanvasThemeConfig = { seed: { colorPrimary: "#111111" } };
    const child: CanvasThemeConfig = { seed: { borderRadius: 8 } };
    const merged = mergeThemeConfig(parent, child);
    expect(merged.seed?.colorPrimary).toBe("#111111");
    expect(merged.seed?.borderRadius).toBe(8);
  });

  it("merges components.Button partials", () => {
    const parent: CanvasThemeConfig = {
      components: { Button: { colorPrimary: "#111111", paddingMD: 20 } },
    };
    const child: CanvasThemeConfig = {
      components: { Button: { paddingMD: 24 } },
    };
    const merged = mergeThemeConfig(parent, child);
    expect(merged.components?.Button?.colorPrimary).toBe("#111111");
    expect(merged.components?.Button?.paddingMD).toBe(24);
  });
});
