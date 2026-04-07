import { describe, expect, it } from "vite-plus/test";
import { applyUniqueReplace, formatLabTsxLineSlice } from "./mobile-app-lab-tsx-tools.ts";

describe("applyUniqueReplace", () => {
  it("replaces single occurrence", () => {
    const r = applyUniqueReplace("aa bb aa", "bb", "XX");
    expect(r).toEqual({ ok: true, next: "aa XX aa" });
  });

  it("rejects zero matches", () => {
    const r = applyUniqueReplace("abc", "z", "q");
    expect(r.ok).toBe(false);
  });

  it("rejects multiple matches", () => {
    const r = applyUniqueReplace("foo foo", "foo", "bar");
    expect(r.ok).toBe(false);
  });

  it("rejects empty old_string", () => {
    const r = applyUniqueReplace("a", "", "b");
    expect(r.ok).toBe(false);
  });
});

describe("formatLabTsxLineSlice", () => {
  it("returns numbered lines", () => {
    const { text, totalLines, returnedLines } = formatLabTsxLineSlice("a\nb\nc", 2, 3);
    expect(totalLines).toBe(3);
    expect(returnedLines).toBe(2);
    expect(text).toBe("2|b\n3|c");
  });

  it("clamps to file bounds", () => {
    const { text, totalLines, returnedLines } = formatLabTsxLineSlice("only", 1, 99);
    expect(totalLines).toBe(1);
    expect(returnedLines).toBe(1);
    expect(text).toBe("1|only");
  });
});
