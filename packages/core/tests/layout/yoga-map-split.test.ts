import { describe, expect, it } from "vite-plus/test";
import { splitStyle } from "../../src/layout/yoga-map.ts";

describe("splitStyle", () => {
  it("splits visual keys from layout keys", () => {
    const { layout, visual } = splitStyle({
      width: 100,
      flex: 1,
      backgroundColor: "#fff",
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "#000",
      opacity: 0.5,
    });
    expect(layout).toEqual({ width: 100, flex: 1 });
    expect(visual).toEqual({
      backgroundColor: "#fff",
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "#000",
      opacity: 0.5,
    });
  });

  it("omits undefined entries", () => {
    const { layout, visual } = splitStyle({
      width: 50,
      backgroundColor: undefined,
      height: 20,
    });
    expect(layout).toEqual({ width: 50, height: 20 });
    expect(visual).toEqual({});
  });

  it("display is grouped with layout keys (not VISUAL_KEYS)", () => {
    const { layout, visual } = splitStyle({
      display: "none",
      width: 10,
    });
    expect(layout).toEqual({ width: 10, display: "none" });
    expect(visual).toEqual({});
  });

  it("cursor is visual-only (no Yoga)", () => {
    const { layout, visual } = splitStyle({
      width: 100,
      cursor: "pointer",
    });
    expect(layout).toEqual({ width: 100 });
    expect(visual).toEqual({ cursor: "pointer" });
  });
});
