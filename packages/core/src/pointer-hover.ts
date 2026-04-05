import { buildPathToRoot } from "./hit-test.ts";
import type { CanvasSyntheticPointerEvent } from "./pointer-types.ts";
import { getWorldOffset } from "./world-bounds.ts";
import type { ViewNode } from "./view-node.ts";

/**
 * Compare previous vs next deepest hit to get leave (leaf-first) and enter (root-first) chains.
 * Used for synthetic `pointerenter` / `pointerleave` without a DOM.
 */
export function diffHoverEnterLeave(
  prev: ViewNode | null,
  next: ViewNode | null,
  sceneRoot: ViewNode,
): { leave: ViewNode[]; enter: ViewNode[] } {
  const prevPath = prev ? buildPathToRoot(prev, sceneRoot) : [];
  const nextPath = next ? buildPathToRoot(next, sceneRoot) : [];
  let k = 0;
  const pl = prevPath.length;
  const nl = nextPath.length;
  while (k < pl && k < nl && prevPath[k] === nextPath[k]) k++;
  return {
    leave: prevPath.slice(k).reverse(),
    enter: nextPath.slice(k),
  };
}

/**
 * Dispatch `pointerenter` or `pointerleave` to a single node (no capture/bubble chain).
 * `target` is the node the event refers to (same as `currentTarget` for our synthetic events).
 */
export function dispatchPointerEnterLeave(
  sceneRoot: ViewNode,
  kind: "pointerenter" | "pointerleave",
  node: ViewNode,
  pageX: number,
  pageY: number,
  pointerId: number,
  timestamp: number,
): void {
  const h = node.interactionHandlers;
  const fn = kind === "pointerenter" ? h.onPointerEnter : h.onPointerLeave;
  if (!fn) return;
  const o = getWorldOffset(node, sceneRoot);
  let defaultPrevented = false;
  const e: CanvasSyntheticPointerEvent = {
    type: kind,
    pointerId,
    target: node,
    currentTarget: node,
    locationX: pageX - o.x,
    locationY: pageY - o.y,
    pageX,
    pageY,
    timestamp,
    stopPropagation(): void {},
    preventDefault(): void {
      defaultPrevented = true;
    },
    get defaultPrevented() {
      return defaultPrevented;
    },
  };
  fn(e);
}
