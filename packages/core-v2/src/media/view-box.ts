export const DEFAULT_SVG_VIEW_BOX = "0 0 24 24";

export type ViewBoxRect = { minX: number; minY: number; width: number; height: number };

export type ParseViewBoxResult =
  | { ok: true; minX: number; minY: number; width: number; height: number }
  | { ok: false };

export function parseSvgViewBox(input: string | undefined): ParseViewBoxResult {
  const raw = (input ?? DEFAULT_SVG_VIEW_BOX).trim();
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  if (parts.length !== 4) return { ok: false };
  const nums = parts.map((p) => Number.parseFloat(p));
  if (nums.some((n) => !Number.isFinite(n))) return { ok: false };
  const [minX, minY, width, height] = nums;
  if (width <= 0 || height <= 0) return { ok: false };
  return { ok: true, minX, minY, width, height };
}

export type ViewBoxTransform = { scale: number; translateX: number; translateY: number };

/**
 * 将 viewBox 用户空间 **等比** 映射到 `dest` 矩形内并 **居中**（letterbox）。
 * 返回量用于组合 SkMatrix：`translate(translateX, translateY) * scale(scale) * translate(-minX, -minY)`。
 */
export function viewBoxToDestTransform(
  vb: ViewBoxRect,
  dest: { x: number; y: number; width: number; height: number },
): ViewBoxTransform {
  if (dest.width <= 0 || dest.height <= 0 || vb.width <= 0 || vb.height <= 0) {
    return { scale: 0, translateX: dest.x, translateY: dest.y };
  }
  const scale = Math.min(dest.width / vb.width, dest.height / vb.height);
  const contentW = vb.width * scale;
  const contentH = vb.height * scale;
  const tx = dest.x + (dest.width - contentW) / 2;
  const ty = dest.y + (dest.height - contentH) / 2;
  return { scale, translateX: tx, translateY: ty };
}
