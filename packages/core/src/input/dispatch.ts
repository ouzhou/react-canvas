import type { CanvasSyntheticPointerEvent } from "./types.ts";
import { getWorldOffset } from "../geometry/world-bounds.ts";
import type { ViewNode } from "../scene/view-node.ts";

type BubbleKind = "pointerdown" | "pointerup" | "pointermove" | "pointercancel" | "click";

function callCaptureHandler(
  h: ViewNode["interactionHandlers"],
  kind: BubbleKind,
  e: CanvasSyntheticPointerEvent,
): void {
  if (kind === "pointerdown" && h.onPointerDownCapture) h.onPointerDownCapture(e);
  else if ((kind === "pointerup" || kind === "pointercancel") && h.onPointerUpCapture)
    h.onPointerUpCapture(e);
  else if (kind === "pointermove" && h.onPointerMoveCapture) h.onPointerMoveCapture(e);
  else if (kind === "click" && h.onClickCapture) h.onClickCapture(e);
}

function callBubbleHandler(
  h: ViewNode["interactionHandlers"],
  kind: BubbleKind,
  e: CanvasSyntheticPointerEvent,
): void {
  if (kind === "pointerdown" && h.onPointerDown) h.onPointerDown(e);
  else if (kind === "pointerup" && h.onPointerUp) h.onPointerUp(e);
  else if (kind === "pointermove" && h.onPointerMove) h.onPointerMove(e);
  else if (kind === "pointercancel" && h.onPointerUp) h.onPointerUp(e);
  else if (kind === "click" && h.onClick) h.onClick(e);
}

/**
 * Capture + Bubble: capture from sceneRoot to parent-of-target, then bubble from target back up.
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

  const makeEvent = (node: ViewNode): CanvasSyntheticPointerEvent => {
    const o = getWorldOffset(node, sceneRoot);
    return {
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
  };

  // Capture phase: root → parent of target (exclude target itself)
  const bubbleKind = kind as BubbleKind;
  for (let i = 0; i < path.length - 1; i++) {
    if (stopped) break;
    const node = path[i]!;
    callCaptureHandler(node.interactionHandlers, bubbleKind, makeEvent(node));
  }

  // Bubble phase: target → root
  for (let i = path.length - 1; i >= 0; i--) {
    if (stopped) break;
    const node = path[i]!;
    callBubbleHandler(node.interactionHandlers, bubbleKind, makeEvent(node));
  }
}
