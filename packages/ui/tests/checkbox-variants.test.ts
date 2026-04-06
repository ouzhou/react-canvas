import { describe, expect, it } from "vite-plus/test";
import { checkboxBoxSize, getCheckboxStyles } from "../src/components/checkbox/variants.ts";
import type { CanvasToken } from "../src/theme/types.ts";

const mockToken: CanvasToken = {
  colorPrimary: "#1677ff",
  colorBgLayout: "#f5f5f5",
  colorText: "rgba(0,0,0,0.85)",
  colorBorder: "#d9d9d9",
  borderRadius: 6,
  paddingSM: 8,
  paddingMD: 12,
  fontSizeSM: 12,
  fontSizeMD: 14,
};

describe("getCheckboxStyles", () => {
  it("md size uses 18x18 and border token", () => {
    const s = getCheckboxStyles("md", mockToken);
    expect(s.width).toBe(18);
    expect(s.height).toBe(18);
    expect(s.borderColor).toBe("#d9d9d9");
  });

  it("checkboxBoxSize sm is 14", () => {
    expect(checkboxBoxSize("sm")).toBe(14);
  });
});
