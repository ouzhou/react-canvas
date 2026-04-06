import type { CanvasKit } from "canvaskit-wasm";
import { hitTest } from "./hit-test.ts";
import type { ViewNode } from "../scene/view-node.ts";

/** Max distance (logical px) between down and up for a synthetic `click`. */
export const DEFAULT_CLICK_MOVE_THRESHOLD_PX = 10;

export type PointerDownSnapshot = {
  pageX: number;
  pageY: number;
  target: ViewNode;
};

/**
 * `click` fires if movement is within threshold and release point still hits `down.target`
 *（与 `hitTest` 一致，含 `transform`）。
 */
export function shouldEmitClick(
  down: PointerDownSnapshot,
  pageX: number,
  pageY: number,
  sceneRoot: ViewNode,
  canvasKit: CanvasKit,
  moveThresholdPx: number = DEFAULT_CLICK_MOVE_THRESHOLD_PX,
): boolean {
  const dx = pageX - down.pageX;
  const dy = pageY - down.pageY;
  if (dx * dx + dy * dy > moveThresholdPx * moveThresholdPx) return false;
  return hitTest(sceneRoot, pageX, pageY, canvasKit) === down.target;
}
