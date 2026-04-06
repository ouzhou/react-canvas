/**
 * 局部坐标下判断点是否在轴对齐圆角矩形内（四角为半径 `r` 的 1/4 圆）。
 * `r` 会按 CSS 规则钳制为 `min(r, w/2, h/2)`。
 */
export function pointInRoundedRectLocal(
  px: number,
  py: number,
  w: number,
  h: number,
  r: number,
): boolean {
  if (w <= 0 || h <= 0) return false;
  /** 与 `hit-test` 中 `pointInRect` 一致：右、下边界为开区间。 */
  if (px < 0 || py < 0 || px >= w || py >= h) return false;
  const rr = Math.min(r, w / 2, h / 2);
  if (rr <= 0) return true;

  if (px < rr && py < rr) {
    const dx = rr - px;
    const dy = rr - py;
    return dx * dx + dy * dy <= rr * rr;
  }
  if (px > w - rr && py < rr) {
    const dx = px - (w - rr);
    const dy = rr - py;
    return dx * dx + dy * dy <= rr * rr;
  }
  if (px < rr && py > h - rr) {
    const dx = rr - px;
    const dy = py - (h - rr);
    return dx * dx + dy * dy <= rr * rr;
  }
  if (px > w - rr && py > h - rr) {
    const dx = px - (w - rr);
    const dy = py - (h - rr);
    return dx * dx + dy * dy <= rr * rr;
  }
  return true;
}
