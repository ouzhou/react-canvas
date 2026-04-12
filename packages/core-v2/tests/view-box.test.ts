import { expect, test } from "vite-plus/test";
import {
  DEFAULT_SVG_VIEW_BOX,
  parseSvgViewBox,
  viewBoxToDestTransform,
} from "../src/media/view-box.ts";

test("parse default lucide viewBox", () => {
  expect(parseSvgViewBox(undefined)).toEqual({ ok: true, minX: 0, minY: 0, width: 24, height: 24 });
  expect(parseSvgViewBox("  0 0 24 24 ")).toEqual({
    ok: true,
    minX: 0,
    minY: 0,
    width: 24,
    height: 24,
  });
  expect(DEFAULT_SVG_VIEW_BOX).toBe("0 0 24 24");
});

test("parse rejects non-finite", () => {
  expect(parseSvgViewBox("0 0 NaN 24").ok).toBe(false);
});

test("uniform scale and center into dest", () => {
  const vb = { minX: 0, minY: 0, width: 24, height: 24 };
  const m = viewBoxToDestTransform(vb, { x: 0, y: 0, width: 48, height: 48 });
  expect(m.scale).toBe(2);
  expect(m.translateX).toBe(0);
  expect(m.translateY).toBe(0);
});

test("letterbox vertically", () => {
  const vb = { minX: 0, minY: 0, width: 24, height: 24 };
  const m = viewBoxToDestTransform(vb, { x: 0, y: 0, width: 48, height: 24 });
  expect(m.scale).toBe(1);
  expect(m.translateX).toBe(12);
  expect(m.translateY).toBe(0);
});
