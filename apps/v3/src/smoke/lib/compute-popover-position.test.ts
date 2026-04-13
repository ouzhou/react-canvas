import { describe, expect, test } from "vite-plus/test";

import { computePopoverPosition } from "./compute-popover-position";

describe("computePopoverPosition", () => {
  test("returns base position for bottom placement", () => {
    const result = computePopoverPosition({
      placement: "bottom",
      triggerRect: { left: 100, top: 50, width: 80, height: 24 },
      panelSize: { width: 120, height: 60 },
      viewportSize: { width: 500, height: 400 },
    });

    expect(result).toEqual({
      left: 80,
      top: 82,
    });
  });

  test("uses default offset and padding when omitted", () => {
    const withDefaults = computePopoverPosition({
      placement: "bottom",
      triggerRect: { left: 100, top: 50, width: 80, height: 24 },
      panelSize: { width: 120, height: 60 },
      viewportSize: { width: 500, height: 400 },
    });
    const withExplicitDefaults = computePopoverPosition({
      placement: "bottom",
      triggerRect: { left: 100, top: 50, width: 80, height: 24 },
      panelSize: { width: 120, height: 60 },
      viewportSize: { width: 500, height: 400 },
      offset: 8,
      padding: 8,
    });

    expect(withDefaults).toEqual(withExplicitDefaults);
  });

  test("clamps right placement inside viewport", () => {
    const result = computePopoverPosition({
      placement: "right",
      triggerRect: { left: 260, top: 80, width: 40, height: 20 },
      panelSize: { width: 120, height: 60 },
      viewportSize: { width: 320, height: 200 },
      padding: 12,
    });

    expect(result).toEqual({
      left: 188,
      top: 60,
    });
  });

  test("computes top placement", () => {
    const result = computePopoverPosition({
      placement: "top",
      triggerRect: { left: 60, top: 80, width: 100, height: 30 },
      panelSize: { width: 80, height: 40 },
      viewportSize: { width: 300, height: 300 },
      offset: 10,
    });

    expect(result).toEqual({
      left: 70,
      top: 30,
    });
  });

  test("computes left placement", () => {
    const result = computePopoverPosition({
      placement: "left",
      triggerRect: { left: 100, top: 120, width: 60, height: 40 },
      panelSize: { width: 50, height: 50 },
      viewportSize: { width: 400, height: 300 },
      offset: 8,
    });

    expect(result).toEqual({
      left: 42,
      top: 115,
    });
  });

  test("falls back to padding when panel exceeds available viewport", () => {
    const result = computePopoverPosition({
      placement: "bottom",
      triggerRect: { left: 40, top: 20, width: 60, height: 30 },
      panelSize: { width: 220, height: 180 },
      viewportSize: { width: 180, height: 140 },
      padding: 12,
    });

    expect(result).toEqual({
      left: 12,
      top: 12,
    });
  });
});
