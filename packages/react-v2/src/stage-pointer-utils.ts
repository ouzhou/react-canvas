import { clientXYToStageLocal } from "@react-canvas/core-v2";

/**
 * DOM 宿主便捷方法：用元素的 `getBoundingClientRect()` 与 `clientXYToStageLocal`（见 `@react-canvas/core-v2`）得到 Stage 坐标。
 * 非 React 环境也可直接调 `clientXYToStageLocal({ left: r.left, top: r.top }, clientX, clientY)`。
 */
export function clientToStageLocal(
  element: Element,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const r = element.getBoundingClientRect();
  return clientXYToStageLocal({ left: r.left, top: r.top }, clientX, clientY);
}
