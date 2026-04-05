import { describe, expect, it } from "vite-plus/test";
import { getCanvasToken, mergeViewStyles } from "../src/index.ts";

describe("@react-canvas/ui public surface", () => {
  it("getCanvasToken + mergeViewStyles", () => {
    const t = getCanvasToken({});
    expect(t.colorPrimary).toBeDefined();
    expect(mergeViewStyles({ flex: 1 }, { opacity: 1 })).toEqual({ flex: 1, opacity: 1 });
  });
});
