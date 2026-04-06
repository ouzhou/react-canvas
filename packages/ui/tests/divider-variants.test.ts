import { describe, expect, it } from "vite-plus/test";
import { getDividerLineStyle, getDividerSegmentStyle } from "../src/components/divider/variants.ts";
import { defaultAlgorithm } from "../src/theme/algorithms.ts";
import { DEFAULT_SEED } from "../src/theme/seed.ts";

const mockToken = defaultAlgorithm(DEFAULT_SEED);

describe("getDividerLineStyle", () => {
  it("horizontal: hairline height and border color", () => {
    const s = getDividerLineStyle("horizontal", mockToken);
    expect(s.backgroundColor).toBe("#d9d9d9");
    expect(s.height).toBe(1);
    expect(s.alignSelf).toBe("stretch");
  });

  it("vertical: hairline width and border color", () => {
    const s = getDividerLineStyle("vertical", mockToken);
    expect(s.backgroundColor).toBe("#d9d9d9");
    expect(s.width).toBe(1);
    expect(s.alignSelf).toBe("stretch");
  });
});

describe("getDividerSegmentStyle", () => {
  it("horizontal segment grows on main axis", () => {
    const s = getDividerSegmentStyle("horizontal", mockToken);
    expect(s.backgroundColor).toBe("#d9d9d9");
    expect(s.height).toBe(1);
    expect(s.flexGrow).toBe(1);
    expect(s.minWidth).toBe(0);
  });

  it("vertical segment grows on main axis", () => {
    const s = getDividerSegmentStyle("vertical", mockToken);
    expect(s.backgroundColor).toBe("#d9d9d9");
    expect(s.width).toBe(1);
    expect(s.flexGrow).toBe(1);
    expect(s.minHeight).toBe(0);
  });
});
