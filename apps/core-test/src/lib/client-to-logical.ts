/** DOM 指针坐标 → 场景根逻辑坐标（与 `ViewNode.layout` 一致）。 */
export function clientToCanvasLogical(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const rw = rect.width || 1;
  const rh = rect.height || 1;
  return {
    x: ((clientX - rect.left) * logicalWidth) / rw,
    y: ((clientY - rect.top) * logicalHeight) / rh,
  };
}
