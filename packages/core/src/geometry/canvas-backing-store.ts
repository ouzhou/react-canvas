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
 * dimensions. Independent rounding of `lw*dpr` and `lh*dpr` can break that ratio; the previous
 * float `aspectOk` could still leave `bw*lh !== bh*lw`, so `bw/lw !== bh/lh` and a single
 * `scale(dpr)` becomes non-uniform (content looks stretched or "thin").
 *
 * Write `lw = g·a`, `lh = g·b` with `g = gcd(lw,lh)` and `gcd(a,b)=1`. Any exact rational aspect
 * `bw/bh = lw/lh` has the form `bw = k·a`, `bh = k·b` for integer `k`. We pick `k ≈ g·dpr`.
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
