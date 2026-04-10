import { describe, expect, test } from "vite-plus/test";
import { canvasBackingStoreSize, gcd } from "../../src/geometry/canvas-backing-store.ts";

describe("gcd", () => {
  test("computes greatest common divisor", () => {
    expect(gcd(1000, 300)).toBe(100);
    expect(gcd(100, 100)).toBe(100);
    expect(gcd(7, 5)).toBe(1);
    expect(gcd(12, 8)).toBe(4);
  });
});

describe("canvasBackingStoreSize", () => {
  test("keeps exact integer cross-product bw*lh === bh*lw (uniform scale)", () => {
    for (let lw = 1; lw <= 80; lw++) {
      for (let lh = 1; lh <= 80; lh++) {
        for (const dpr of [0.75, 1, 1.25, 1.333, 1.5, 2, 2.5, 3]) {
          const { bw, bh, rootScale } = canvasBackingStoreSize(lw, lh, dpr);
          expect(bw * lh).toBe(bh * lw);
          expect(bw / lw).toBeCloseTo(bh / lh, 12);
          expect(rootScale).toBeCloseTo(bw / lw, 12);
        }
      }
    }
  });

  test("regression: 1000×300 @ dpr 1.333 no longer yields skewed 1333×400", () => {
    const { bw, bh } = canvasBackingStoreSize(1000, 300, 1.333);
    expect(bw).toBe(1330);
    expect(bh).toBe(399);
    expect(bw * 300).toBe(bh * 1000);
  });
});
