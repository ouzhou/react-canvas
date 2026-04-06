import { describe, expect, it } from "vite-plus/test";
import { getCanvasToken } from "../src/theme/get-canvas-token.ts";
import { getButtonHoverStylePatch, getButtonStyles } from "../src/components/button/variants.ts";

describe("Button styles", () => {
  it("primary uses token colorPrimary as background", () => {
    const token = getCanvasToken({});
    const s = getButtonStyles("primary", "md", token);
    expect(s.backgroundColor).toBe(token.colorPrimary);
  });

  it("ghost uses transparent background and border", () => {
    const token = getCanvasToken({});
    const s = getButtonStyles("ghost", "md", token);
    expect(s.backgroundColor).toBe("transparent");
    expect(s.borderWidth).toBe(1);
  });

  it("primary hover uses colorPrimaryHover (lighter than colorPrimary)", () => {
    const token = getCanvasToken({});
    const h = getButtonHoverStylePatch("primary", token);
    expect(h.backgroundColor).toBe(token.colorPrimaryHover);
    expect(h.backgroundColor).not.toBe(token.colorPrimary);
  });

  it("ghost hover uses colorBgHover", () => {
    const token = getCanvasToken({});
    const h = getButtonHoverStylePatch("ghost", token);
    expect(h.backgroundColor).toBe(token.colorBgHover);
  });
});
