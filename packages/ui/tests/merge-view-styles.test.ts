import { describe, expect, it } from "vite-plus/test";
import { mergeViewStyles } from "../src/style/merge.ts";

describe("mergeViewStyles", () => {
  it("later overrides earlier", () => {
    expect(mergeViewStyles({ flex: 1 }, { opacity: 0.5 })).toEqual({ flex: 1, opacity: 0.5 });
  });

  it("flattens nested arrays", () => {
    expect(mergeViewStyles([{ flex: 1 }, { opacity: 0.3 }], { opacity: 0.8 })).toEqual({
      flex: 1,
      opacity: 0.8,
    });
  });

  it("skips undefined entries", () => {
    expect(mergeViewStyles(undefined, { width: 100 })).toEqual({ width: 100 });
  });
});
