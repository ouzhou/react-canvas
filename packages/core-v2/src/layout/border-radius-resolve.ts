const percentRe = /^(\d+(?:\.\d+)?)%$/;

/**
 * 将 `ViewStyle.borderRadius` 解析为 Skia 使用的水平/垂直半径（px），并做与 CSS 一致的收缩：
 * 同一对 `(rx, ry)` 按比例缩放，使 `2*rx <= width` 且 `2*ry <= height`（任一半径为 `0` 时跳过对应约束）。
 *
 * 非法输入（非有限数、负数、无法解析的百分比串）→ `{ rx: 0, ry: 0 }`。
 */
export function resolveBorderRadiusRxRy(
  borderRadius: number | `${number}%`,
  width: number,
  height: number,
): { rx: number; ry: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { rx: 0, ry: 0 };
  }

  let rx0: number;
  let ry0: number;

  if (typeof borderRadius === "number") {
    if (!Number.isFinite(borderRadius) || borderRadius < 0) {
      return { rx: 0, ry: 0 };
    }
    rx0 = borderRadius;
    ry0 = borderRadius;
  } else {
    const m = percentRe.exec(borderRadius);
    if (!m) {
      return { rx: 0, ry: 0 };
    }
    const p = Number(m[1]);
    if (!Number.isFinite(p) || p < 0) {
      return { rx: 0, ry: 0 };
    }
    rx0 = (p / 100) * width;
    ry0 = (p / 100) * height;
  }

  if ((!Number.isFinite(rx0) || rx0 < 0) && (!Number.isFinite(ry0) || ry0 < 0)) {
    return { rx: 0, ry: 0 };
  }
  rx0 = Math.max(0, Number.isFinite(rx0) ? rx0 : 0);
  ry0 = Math.max(0, Number.isFinite(ry0) ? ry0 : 0);

  if (rx0 === 0 && ry0 === 0) {
    return { rx: 0, ry: 0 };
  }

  let f = 1;
  if (rx0 > 0) {
    f = Math.min(f, width / (2 * rx0));
  }
  if (ry0 > 0) {
    f = Math.min(f, height / (2 * ry0));
  }
  f = Math.min(1, f);
  return { rx: rx0 * f, ry: ry0 * f };
}
