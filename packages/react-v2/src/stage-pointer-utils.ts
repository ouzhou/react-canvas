/**
 * 将视口 DOM 坐标（`clientX` / `clientY`）转为与 `SceneRuntime` 一致的 Stage 局部坐标（与 `createSceneRuntime({ width, height })` 的 CSS 像素对齐）。
 * Skia `<canvas>` 或其它作为命中面的元素均可传入同一 `element`（通常为 `event.currentTarget`）。
 */
export function clientToStageLocal(
  element: Element,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const r = element.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}
