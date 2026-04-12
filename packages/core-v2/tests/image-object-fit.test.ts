import { expect, test } from "vite-plus/test";
import { computeImageDestSrcRects } from "../src/media/image-object-fit.ts";

test("contain letterboxes wide image in tall box", () => {
  const r = computeImageDestSrcRects({
    objectFit: "contain",
    destW: 100,
    destH: 200,
    imageW: 200,
    imageH: 100,
  });
  expect(r.dest).toEqual({ x: 0, y: 75, width: 100, height: 50 });
  expect(r.src).toEqual({ x: 0, y: 0, width: 200, height: 100 });
});

test("cover crops to fill tall box", () => {
  const r = computeImageDestSrcRects({
    objectFit: "cover",
    destW: 100,
    destH: 200,
    imageW: 200,
    imageH: 100,
  });
  expect(r.src.x).toBeGreaterThan(0);
  expect(r.src.width).toBeLessThan(200);
  expect(r.dest).toEqual({ x: 0, y: 0, width: 100, height: 200 });
});

test("fill stretches to full dest", () => {
  const r = computeImageDestSrcRects({
    objectFit: "fill",
    destW: 100,
    destH: 200,
    imageW: 50,
    imageH: 50,
  });
  expect(r.dest).toEqual({ x: 0, y: 0, width: 100, height: 200 });
  expect(r.src).toEqual({ x: 0, y: 0, width: 50, height: 50 });
});

test("zero dest returns safe rects", () => {
  const r = computeImageDestSrcRects({
    objectFit: "contain",
    destW: 0,
    destH: 100,
    imageW: 10,
    imageH: 10,
  });
  expect(r.dest.width).toBe(0);
});
