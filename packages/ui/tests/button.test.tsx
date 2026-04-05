import { describe, expect, it } from "vite-plus/test";
import { getCanvasToken } from "../src/theme/get-canvas-token.ts";
import { getButtonStyles } from "../src/components/button/variants.ts";

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
});
