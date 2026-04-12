import { describe, expect, test } from "vite-plus/test";
import { resolveBorderRadiusRxRy } from "../src/layout/border-radius-resolve.ts";

describe("resolveBorderRadiusRxRy", () => {
  test("px: uniform 10 on 100x40 stays within both axes", () => {
    const { rx, ry } = resolveBorderRadiusRxRy(10, 100, 40);
    expect(rx).toBe(10);
    expect(ry).toBe(10);
    expect(rx * 2).toBeLessThanOrEqual(100);
    expect(ry * 2).toBeLessThanOrEqual(40);
  });

  test("px: large uniform scales down (pill cap)", () => {
    const { rx, ry } = resolveBorderRadiusRxRy(80, 100, 40);
    expect(rx).toBe(20);
    expect(ry).toBe(20);
    expect(rx * 2).toBeLessThanOrEqual(100);
    expect(ry * 2).toBeLessThanOrEqual(40);
  });

  test("percent 50% on 80x60", () => {
    const { rx, ry } = resolveBorderRadiusRxRy("50%", 80, 60);
    expect(rx).toBeCloseTo(40, 5);
    expect(ry).toBeCloseTo(30, 5);
  });

  test("zero size", () => {
    expect(resolveBorderRadiusRxRy(8, 0, 10)).toEqual({ rx: 0, ry: 0 });
    expect(resolveBorderRadiusRxRy(8, 10, 0)).toEqual({ rx: 0, ry: 0 });
  });

  test("invalid string", () => {
    expect(resolveBorderRadiusRxRy("12" as `${number}%`, 10, 10)).toEqual({ rx: 0, ry: 0 });
  });

  test("negative number", () => {
    expect(resolveBorderRadiusRxRy(-1, 10, 10)).toEqual({ rx: 0, ry: 0 });
  });
});
