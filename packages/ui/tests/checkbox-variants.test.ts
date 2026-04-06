import { describe, expect, it } from "vite-plus/test";
import { checkboxBoxSize, getCheckboxStyles } from "../src/components/checkbox/variants.ts";
import { defaultAlgorithm } from "../src/theme/algorithms.ts";
import { DEFAULT_SEED } from "../src/theme/seed.ts";

const mockToken = defaultAlgorithm(DEFAULT_SEED);

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
