import type { Canvas } from "canvaskit-wasm";

/**
 * RN-style transform steps (subset). Applied left-to-right; default origin is the **center** of
 * the layout box (aligns with common RN/Web expectations for rotate/scale).
 */
export type TransformOp =
  | { readonly translateX?: number; readonly translateY?: number }
  | { readonly scale?: number }
  | { readonly scaleX?: number; readonly scaleY?: number }
  | { readonly rotate?: string | number };

export type TransformStyle = readonly TransformOp[];

function parseRotate(value: string | number): number {
  if (typeof value === "number") return value;
  const s = String(value).trim();
  if (s.endsWith("deg")) return (Number.parseFloat(s) * Math.PI) / 180;
  if (s.endsWith("rad")) return Number.parseFloat(s);
  return (Number.parseFloat(s) * Math.PI) / 180;
}

/**
 * Apply RN `transform` in local space after `translate(layoutX, layoutY)`.
 * Pivot: center of the `width × height` box (rotate / uniform scale feel like RN defaults).
 */
export function applyViewTransform(
  skCanvas: Canvas,
  transform: TransformStyle | undefined,
  width: number,
  height: number,
): void {
  if (!transform || transform.length === 0) return;
  const cx = width / 2;
  const cy = height / 2;
  skCanvas.translate(cx, cy);
  for (const op of transform) {
    const t = op as Record<string, unknown>;
    if ("translateX" in op || "translateY" in op) {
      skCanvas.translate(Number(t.translateX ?? 0), Number(t.translateY ?? 0));
    } else if ("scale" in op && t.scale !== undefined) {
      const s = Number(t.scale);
      skCanvas.scale(s, s);
    } else if ("scaleX" in op || "scaleY" in op) {
      skCanvas.scale(Number(t.scaleX ?? 1), Number(t.scaleY ?? 1));
    } else if ("rotate" in op && t.rotate !== undefined) {
      const rad = parseRotate(t.rotate as string | number);
      skCanvas.rotate(rad, 0, 0);
    }
  }
  skCanvas.translate(-cx, -cy);
}

/** 2D affine column matrix: [x'] = [a b e][x]; [y'] = [c d f][y]. */
export type Affine2D = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
};

function identityAffine(): Affine2D {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function multiplyAffine(l: Affine2D, r: Affine2D): Affine2D {
  return {
    a: l.a * r.a + l.b * r.c,
    b: l.a * r.b + l.b * r.d,
    e: l.a * r.e + l.b * r.f + l.e,
    c: l.c * r.a + l.d * r.c,
    d: l.c * r.b + l.d * r.d,
    f: l.c * r.e + l.d * r.f + l.f,
  };
}

function translateAffine(tx: number, ty: number): Affine2D {
  return { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty };
}

function scaleAffine(sx: number, sy: number): Affine2D {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

function rotateAffine(rad: number): Affine2D {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { a: cos, b: -sin, c: sin, d: cos, e: 0, f: 0 };
}

function opToAffine(op: TransformOp): Affine2D {
  const t = op as Record<string, unknown>;
  if ("translateX" in op || "translateY" in op) {
    return translateAffine(Number(t.translateX ?? 0), Number(t.translateY ?? 0));
  }
  if ("scale" in op && t.scale !== undefined) {
    const s = Number(t.scale);
    return scaleAffine(s, s);
  }
  if ("scaleX" in op || "scaleY" in op) {
    return scaleAffine(Number(t.scaleX ?? 1), Number(t.scaleY ?? 1));
  }
  if ("rotate" in op && t.rotate !== undefined) {
    return rotateAffine(parseRotate(t.rotate as string | number));
  }
  return identityAffine();
}

/**
 * Same transform as {@link applyViewTransform}, as a matrix mapping **local** points (origin =
 * node top-left) to **parent** offsets after the node's `translate(worldX, worldY)` (still in
 * parent / scene space before that world translate).
 */
export function localTransformMatrix(
  width: number,
  height: number,
  transform: TransformStyle | undefined,
): Affine2D {
  if (!transform || transform.length === 0) return identityAffine();
  const cx = width / 2;
  const cy = height / 2;
  let m = identityAffine();
  m = multiplyAffine(m, translateAffine(cx, cy));
  for (const op of transform) {
    m = multiplyAffine(m, opToAffine(op));
  }
  m = multiplyAffine(m, translateAffine(-cx, -cy));
  return m;
}

export function invertAffine2D(m: Affine2D): Affine2D | null {
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  const a = m.d * invDet;
  const b = -m.b * invDet;
  const c = -m.c * invDet;
  const d = m.a * invDet;
  const e = (m.b * m.f - m.d * m.e) * invDet;
  const f = (m.c * m.e - m.a * m.f) * invDet;
  return { a, b, c, d, e, f };
}

export function applyAffine2D(m: Affine2D, x: number, y: number): { x: number; y: number } {
  return {
    x: m.a * x + m.b * y + m.e,
    y: m.c * x + m.d * y + m.f,
  };
}

/**
 * Whether `(lx, ly)` — offset from the node's layout top-left — lies inside the `w×h` box after
 * applying `transform` (same as paint).
 */
export function isLocalPointInsideTransformBounds(
  lx: number,
  ly: number,
  width: number,
  height: number,
  transform: TransformStyle | undefined,
): boolean {
  const m = localTransformMatrix(width, height, transform);
  const inv = invertAffine2D(m);
  if (!inv) return lx >= 0 && lx <= width && ly >= 0 && ly <= height;
  const p = applyAffine2D(inv, lx, ly);
  return p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
}
