import type { CanvasKit } from "canvaskit-wasm";

/**
 * 与 React Native `style.transform` 数组项对齐：每项仅含一个变换键。
 * 首期实现 2D 常用子集；顺序与 RN 一致（`Matrix.multiply` 从左到右相乘，先写的项先作用在列向量上）。
 *
 * @see https://reactnative.dev/docs/transforms#transform
 */
export type TransformOp =
  | { readonly rotate: string }
  | { readonly scale: number }
  | { readonly scaleX: number }
  | { readonly scaleY: number }
  | { readonly translateX: number }
  | { readonly translateY: number };

/** 解析 RN 风格角度串，如 `45deg`、`0.5rad`；无法解析时返回 `0`。 */
export function parseAngleToRadians(s: string): number {
  const t = s.trim().toLowerCase();
  const deg = /^(-?[\d.]+)\s*deg$/.exec(t);
  if (deg) return (Number.parseFloat(deg[1]!) * Math.PI) / 180;
  const rad = /^(-?[\d.]+)\s*rad$/.exec(t);
  if (rad) return Number.parseFloat(rad[1]!);
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

function opToMatrix(ck: CanvasKit, op: TransformOp): number[] {
  if ("translateX" in op) return ck.Matrix.translated(op.translateX, 0);
  if ("translateY" in op) return ck.Matrix.translated(0, op.translateY);
  if ("scale" in op) return ck.Matrix.scaled(op.scale, op.scale, 0, 0);
  if ("scaleX" in op) return ck.Matrix.scaled(op.scaleX, 1, 0, 0);
  if ("scaleY" in op) return ck.Matrix.scaled(1, op.scaleY, 0, 0);
  if ("rotate" in op) {
    const rad = parseAngleToRadians(op.rotate);
    return ck.Matrix.rotated(rad, 0, 0);
  }
  return ck.Matrix.identity();
}

/**
 * 在布局盒中心合成 RN `transform`：`T(center) * M_n * … * M_1 * T(-center)`。
 * 供 `Canvas.concat` 使用（与 Skia 当前矩阵相乘）。
 */
export function buildRnTransformMatrix3x3(
  ck: CanvasKit,
  ops: readonly TransformOp[],
  absLeft: number,
  absTop: number,
  width: number,
  height: number,
): number[] {
  if (ops.length === 0) return ck.Matrix.identity();
  const cx = absLeft + width / 2;
  const cy = absTop + height / 2;
  const tC = ck.Matrix.translated(cx, cy);
  const tNeg = ck.Matrix.translated(-cx, -cy);
  let acc = ck.Matrix.identity();
  for (const op of ops) {
    const m = opToMatrix(ck, op);
    acc = ck.Matrix.multiply(m, acc);
  }
  return ck.Matrix.multiply(tC, acc, tNeg);
}
