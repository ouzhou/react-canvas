import { describe, expect, it } from "vite-plus/test";
import { decodeLabTsxFromBase64 } from "./mobile-app-lab-tsx-tools.ts";

describe("decodeLabTsxFromBase64", () => {
  it("round-trips UTF-8 text", () => {
    const src = 'const x = "a"; // 中文';
    const b64 = Buffer.from(src, "utf8").toString("base64");
    expect(decodeLabTsxFromBase64(b64)).toBe(src);
  });

  it("ignores whitespace in base64", () => {
    const b64 = Buffer.from("ab", "utf8").toString("base64");
    const spaced = b64.split("").join(" ");
    expect(decodeLabTsxFromBase64(spaced)).toBe("ab");
  });
});
