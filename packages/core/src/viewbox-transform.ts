/**
 * Map SVG viewBox coordinates into a layout rectangle with uniform scale and letterboxing.
 */

export type ViewBox = { minX: number; minY: number; width: number; height: number };

/** Parse SVG `viewBox="minX minY width height"` (comma or whitespace separated). */
export function parseViewBox(s: string): ViewBox | null {
  const parts = s
    .trim()
    .split(/[\s,]+/)
    .filter((x) => x.length > 0)
    .map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minX, minY, w, h] = parts;
  if (w <= 0 || h <= 0) return null;
  return { minX, minY, width: w, height: h };
}

/**
 * Uniform scale + translation so the viewBox maps to a centered rect inside `layoutW` x `layoutH`.
 * Returns affine coeffs for Skia: x' = scale * (x - minX) + translateX, same for y.
 */
export function viewBoxToAffine(
  vb: ViewBox,
  layoutW: number,
  layoutH: number,
): { scale: number; translateX: number; translateY: number } {
  const lw = layoutW > 0 && Number.isFinite(layoutW) ? layoutW : 0;
  const lh = layoutH > 0 && Number.isFinite(layoutH) ? layoutH : 0;
  if (lw === 0 || lh === 0 || vb.width <= 0 || vb.height <= 0) {
    return { scale: 0, translateX: 0, translateY: 0 };
  }
  const s = Math.min(lw / vb.width, lh / vb.height);
  const tx = (lw - vb.width * s) / 2 - vb.minX * s;
  const ty = (lh - vb.height * s) / 2 - vb.minY * s;
  return { scale: s, translateX: tx, translateY: ty };
}
