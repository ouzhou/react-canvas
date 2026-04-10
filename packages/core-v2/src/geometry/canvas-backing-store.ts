/**
 * Integer GCD for backing-store math (logical dimensions are treated as whole CSS pixels).
 */
export function gcd(a: number, b: number): number {
  let x = Math.floor(Math.abs(a));
  let y = Math.floor(Math.abs(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/**
 * Backing-store size with the same aspect ratio as logical `lw`×`lh`, using only integer
 * dimensions (与 v1 `packages/core` 一致).
 */
export function canvasBackingStoreSize(
  logicalWidth: number,
  logicalHeight: number,
  devicePixelRatio: number,
): { bw: number; bh: number; rootScale: number } {
  const lw = Math.max(1, Math.round(logicalWidth));
  const lh = Math.max(1, Math.round(logicalHeight));
  const g = gcd(lw, lh);
  const a = lw / g;
  const b = lh / g;
  const k = Math.max(1, Math.round(g * devicePixelRatio));
  const bw = k * a;
  const bh = k * b;
  const rootScale = bw / lw;
  return { bw, bh, rootScale };
}
