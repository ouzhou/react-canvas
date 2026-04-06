import type { CanvasSyntheticPointerEvent } from "./types.ts";
import { getWorldOffset } from "../geometry/world-bounds.ts";
import type { ViewNode } from "../scene/view-node.ts";

/**
 * Bubble phase only: from `target` (leaf of `path`) up to `sceneRoot`, calling handlers on each node.
 * `path` must be `[sceneRoot, …, target]`.
 */
export function dispatchBubble(
  path: ViewNode[],
  sceneRoot: ViewNode,
  kind: CanvasSyntheticPointerEvent["type"],
  pageX: number,
  pageY: number,
  pointerId: number,
  timestamp: number,
): void {
  if (path.length === 0) return;
  const target = path[path.length - 1]!;
  let stopped = false;
  let defaultPrevented = false;

  for (let i = path.length - 1; i >= 0; i--) {
    if (stopped) break;
    const node = path[i]!;
    const o = getWorldOffset(node, sceneRoot);
    const e: CanvasSyntheticPointerEvent = {
      type: kind,
      pointerId,
      target,
      currentTarget: node,
      locationX: pageX - o.x,
      locationY: pageY - o.y,
      pageX,
      pageY,
      timestamp,
      stopPropagation(): void {
        stopped = true;
      },
      preventDefault(): void {
        defaultPrevented = true;
      },
      get defaultPrevented() {
        return defaultPrevented;
      },
    };

    const h = node.interactionHandlers;
    if (kind === "pointerdown" && h.onPointerDown) h.onPointerDown(e);
    else if (kind === "pointerup" && h.onPointerUp) h.onPointerUp(e);
    else if (kind === "pointermove" && h.onPointerMove) h.onPointerMove(e);
    else if (kind === "pointercancel" && h.onPointerUp) h.onPointerUp(e);
    else if (kind === "click" && h.onClick) h.onClick(e);
  }
}
