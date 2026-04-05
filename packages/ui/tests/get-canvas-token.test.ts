import { describe, expect, it } from "vite-plus/test";
import { getCanvasToken } from "../src/theme/get-canvas-token.ts";

describe("getCanvasToken", () => {
  it("light default differs from dark background", () => {
    const dark = getCanvasToken({ appearance: "dark" });
    const light = getCanvasToken({ appearance: "light" });
    expect(dark.colorBgLayout).not.toBe(light.colorBgLayout);
  });

  it("compact reduces padding vs default density", () => {
    const compact = getCanvasToken({ density: "compact" });
    const normal = getCanvasToken({ density: "default" });
    expect(compact.paddingMD).toBeLessThan(normal.paddingMD);
  });

  it("dark+compact applies compact before dark (padding differs from dark-only)", () => {
    const darkOnly = getCanvasToken({ appearance: "dark", density: "default" });
    const darkCompact = getCanvasToken({ appearance: "dark", density: "compact" });
    expect(darkCompact.paddingMD).toBeLessThan(darkOnly.paddingMD);
    expect(darkCompact.colorBgLayout).toBe(darkOnly.colorBgLayout);
  });

  it("merges component overrides", () => {
    const t = getCanvasToken({
      components: {
        Button: { colorPrimary: "#ff0000" },
      },
    });
    expect(t.components?.Button?.colorPrimary).toBe("#ff0000");
  });
});
