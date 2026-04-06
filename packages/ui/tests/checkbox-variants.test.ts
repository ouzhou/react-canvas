import { describe, expect, it } from "vite-plus/test";
import { checkboxBoxSize, getCheckboxStyles } from "../src/components/checkbox/variants.ts";
import { defaultAlgorithm } from "../src/theme/algorithms.ts";
import { DEFAULT_SEED } from "../src/theme/seed.ts";
import { getCanvasToken } from "../src/theme/get-canvas-token.ts";

const mockToken = defaultAlgorithm(DEFAULT_SEED);

describe("getCheckboxStyles", () => {
  it("md size uses 18x18, light unchecked border and white fill", () => {
    const s = getCheckboxStyles("md", mockToken);
    expect(s.width).toBe(18);
    expect(s.height).toBe(18);
    expect(s.borderColor).toBe("#d1d5db");
    expect(s.backgroundColor).toBe("#ffffff");
    expect(s.borderRadius).toBe(5);
  });

  it("checkboxBoxSize sm is 14", () => {
    expect(checkboxBoxSize("sm")).toBe(14);
  });

  it("dark appearance uses elevated surface and theme border", () => {
    const dark = getCanvasToken({ appearance: "dark", seed: DEFAULT_SEED });
    const s = getCheckboxStyles("md", dark);
    expect(s.backgroundColor).toBe(dark.colorBgHover);
    expect(s.borderColor).toBe(dark.colorBorder);
  });
});
