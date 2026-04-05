import { describe, expect, it } from "vite-plus/test";
import { getCanvasToken } from "../src/theme/get-canvas-token.ts";
import { resolveSx } from "../src/style/sx.ts";

describe("resolveSx", () => {
  const token = getCanvasToken({});

  it("resolves function branch", () => {
    const sx = resolveSx(token, (t) => ({ backgroundColor: t.colorBgLayout }));
    expect(sx.backgroundColor).toBe(token.colorBgLayout);
  });

  it("resolves array branch in order", () => {
    const sx = resolveSx(token, [{ flex: 1 }, (t) => ({ backgroundColor: t.colorPrimary })]);
    expect(sx.flex).toBe(1);
    expect(sx.backgroundColor).toBe(token.colorPrimary);
  });

  it("returns empty object for undefined", () => {
    expect(resolveSx(token, undefined)).toEqual({});
  });
});
