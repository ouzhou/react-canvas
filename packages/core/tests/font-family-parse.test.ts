import { describe, expect, it } from "vite-plus/test";
import { parseFontFamilyList } from "../src/paragraph-build.ts";

describe("parseFontFamilyList", () => {
  it("trims and strips quotes", () => {
    expect(parseFontFamilyList('"Noto Sans SC", sans-serif')).toEqual([
      "Noto Sans SC",
      "sans-serif",
    ]);
  });

  it("ignores empty segments", () => {
    expect(parseFontFamilyList(" A , , B ")).toEqual(["A", "B"]);
  });
});
