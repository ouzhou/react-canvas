import type { CanvasKit } from "canvaskit-wasm";
import type { TransformStyle } from "../style/view-style.ts";

function parseAngleToRadians(s: string): number {
  const t = s.trim();
  if (t.endsWith("deg")) return (Number.parseFloat(t) * Math.PI) / 180;
  if (t.endsWith("rad")) return Number.parseFloat(t);
  return (Number.parseFloat(t) * Math.PI) / 180;
}

/**
 * 单条 transform 对象 → 局部矩阵（相对布局盒左上角；rotate/scale/skew 默认绕盒中心）。
 */
function transformObjectToMatrix(
  ck: CanvasKit,
  width: number,
  height: number,
  spec: TransformStyle,
): number[] {
  const ox = width / 2;
  const oy = height / 2;

  let m = ck.Matrix.identity();

  const tx = spec.translateX ?? 0;
  const ty = spec.translateY ?? 0;
  if (tx !== 0 || ty !== 0) {
    m = ck.Matrix.multiply(ck.Matrix.translated(tx, ty), m);
  }

  const sx = spec.scaleX ?? spec.scale ?? 1;
  const sy = spec.scaleY ?? spec.scale ?? 1;
  if (sx !== 1 || sy !== 1) {
    m = ck.Matrix.multiply(ck.Matrix.scaled(sx, sy, ox, oy), m);
  }

  if (spec.rotate !== undefined) {
    const rad = parseAngleToRadians(spec.rotate);
    m = ck.Matrix.multiply(ck.Matrix.rotated(rad, ox, oy), m);
  } else if (spec.rotateZ !== undefined) {
    const rad = parseAngleToRadians(spec.rotateZ);
    m = ck.Matrix.multiply(ck.Matrix.rotated(rad, ox, oy), m);
  }

  if (spec.skewX !== undefined) {
    const k = Math.tan(parseAngleToRadians(spec.skewX));
    m = ck.Matrix.multiply(ck.Matrix.skewed(k, 0, ox, oy), m);
  }
  if (spec.skewY !== undefined) {
    const k = Math.tan(parseAngleToRadians(spec.skewY));
    m = ck.Matrix.multiply(ck.Matrix.skewed(0, k, ox, oy), m);
  }

  return m;
}

/**
 * RN：`transform` 数组从左到右依次施加到点上（第一条最先作用）。
 * 矩阵链：`M = step_n * … * step_1`。
 */
export function buildLocalTransformMatrix(
  ck: CanvasKit,
  width: number,
  height: number,
  transform: TransformStyle[] | undefined,
): number[] {
  if (!transform || transform.length === 0) return ck.Matrix.identity();
  let m = ck.Matrix.identity();
  for (const spec of transform) {
    const step = transformObjectToMatrix(ck, width, height, spec);
    m = ck.Matrix.multiply(step, m);
  }
  return m;
}
