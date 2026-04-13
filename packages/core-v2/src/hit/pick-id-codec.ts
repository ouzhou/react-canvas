/** pickId = 0 表示空白（未命中）。 */
export const PICK_ID_EMPTY = 0;

/**
 * 将 pickId（1 … 16,777,215）编码为 RGBA（A 固定 255）。
 * R = (id >> 16) & 0xFF，G = (id >> 8) & 0xFF，B = id & 0xFF。
 */
export function pickIdToRgba(pickId: number): [number, number, number, number] {
  return [(pickId >> 16) & 0xff, (pickId >> 8) & 0xff, pickId & 0xff, 255];
}

/**
 * 从 RGB 反查 pickId。RGB 均为 0 时返回 {@link PICK_ID_EMPTY}。
 */
export function rgbaToPickId(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}
