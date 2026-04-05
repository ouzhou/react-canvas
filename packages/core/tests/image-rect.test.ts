import { describe, expect, it } from "vite-plus/test";
import { computeImageSrcDestRects } from "../src/image-rect.ts";

describe("computeImageSrcDestRects", () => {
  it("stretch maps full src to full box", () => {
    const { src, dst } = computeImageSrcDestRects("stretch", 100, 50, 200, 200);
    expect(src).toEqual({ left: 0, top: 0, width: 100, height: 50 });
    expect(dst).toEqual({ left: 0, top: 0, width: 200, height: 200 });
  });

  it("contain fits entire image inside box (centered)", () => {
    const { src, dst } = computeImageSrcDestRects("contain", 100, 50, 200, 200);
    expect(src).toEqual({ left: 0, top: 0, width: 100, height: 50 });
    expect(dst.width).toBe(200);
    expect(dst.height).toBe(100);
    expect(dst.left).toBe(0);
    expect(dst.top).toBe(50);
  });

  it("contain dst never exceeds box", () => {
    const { dst } = computeImageSrcDestRects("contain", 300, 100, 200, 200);
    expect(dst.left).toBeGreaterThanOrEqual(0);
    expect(dst.top).toBeGreaterThanOrEqual(0);
    expect(dst.left + dst.width).toBeLessThanOrEqual(200);
    expect(dst.top + dst.height).toBeLessThanOrEqual(200);
  });

  it("cover fills box and crops src from center", () => {
    const { src, dst } = computeImageSrcDestRects("cover", 100, 100, 200, 100);
    expect(dst).toEqual({ left: 0, top: 0, width: 200, height: 100 });
    // s = max(200/100, 100/100) = 2; crop 100×50 from source center
    expect(src).toEqual({ left: 0, top: 25, width: 100, height: 50 });
  });

  it("center places smaller image without scaling", () => {
    const { src, dst } = computeImageSrcDestRects("center", 40, 40, 100, 100);
    expect(src).toEqual({ left: 0, top: 0, width: 40, height: 40 });
    expect(dst).toEqual({ left: 30, top: 30, width: 40, height: 40 });
  });

  it("center scales down when image larger than box (like contain)", () => {
    const { dst } = computeImageSrcDestRects("center", 200, 100, 100, 100);
    expect(dst.width).toBe(100);
    expect(dst.height).toBe(50);
    expect(dst.left).toBe(0);
    expect(dst.top).toBe(25);
  });

  it("returns empty rects when box has zero size", () => {
    const { src, dst } = computeImageSrcDestRects("contain", 10, 10, 0, 10);
    expect(src.width).toBe(0);
    expect(dst.width).toBe(0);
  });
});
