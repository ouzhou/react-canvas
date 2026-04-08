/** 与 `packages/react/src/canvas/canvas-backing-store.ts` 一致，保证 DPR 缩放后长宽比不变。 */
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
