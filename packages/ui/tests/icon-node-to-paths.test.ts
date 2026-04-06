import camera from "@lucide/icons/icons/camera";
import { describe, expect, it } from "vite-plus/test";
import {
  circleToPath,
  iconNodeToPathPayloads,
  mergePathDs,
} from "../src/components/icon/icon-node-to-paths.ts";

describe("iconNodeToPathPayloads", () => {
  it("returns one payload for path-only icons", () => {
    const payloads = iconNodeToPathPayloads({
      name: "x",
      node: [["path", { d: "M0 0 L10 10", key: "k" }]],
    });
    expect(payloads).toHaveLength(1);
    expect(payloads[0].d).toContain("M0 0");
  });

  it("handles camera icon (path + circle)", () => {
    const payloads = iconNodeToPathPayloads(camera);
    expect(payloads.length).toBeGreaterThanOrEqual(2);
    expect(payloads.every((p) => p.d.length > 0)).toBe(true);
    const merged = mergePathDs(payloads);
    expect(merged.length).toBeGreaterThan(10);
  });
});

describe("circleToPath", () => {
  it("produces a closed circle path", () => {
    const d = circleToPath(12, 13, 3);
    expect(d).toMatch(/^M /);
    expect(d).toContain("A 3 3");
  });
});
