import { containsPagePoint } from "../geometry/world-bounds.ts";
import type { ViewNode } from "../scene/view-node.ts";

/** Max distance (logical px) between down and up for a synthetic `click`. */
export const DEFAULT_CLICK_MOVE_THRESHOLD_PX = 10;

export type PointerDownSnapshot = {
  pageX: number;
  pageY: number;
  target: ViewNode;
};

/**
 * `click` fires if movement is within threshold and release point is still inside `down.target`'s box.
 */
export function shouldEmitClick(
  down: PointerDownSnapshot,
  pageX: number,
  pageY: number,
  sceneRoot: ViewNode,
  moveThresholdPx: number = DEFAULT_CLICK_MOVE_THRESHOLD_PX,
): boolean {
  const dx = pageX - down.pageX;
  const dy = pageY - down.pageY;
  if (dx * dx + dy * dy > moveThresholdPx * moveThresholdPx) return false;
  return containsPagePoint(down.target, sceneRoot, pageX, pageY);
}
