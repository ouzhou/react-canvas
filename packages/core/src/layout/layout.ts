import type { CanvasKit } from "canvaskit-wasm";
import type { Direction } from "yoga-layout/load";
import { Display } from "yoga-layout/load";
import { clearLayoutCanvasKit, setLayoutCanvasKit } from "./canvas-kit.ts";
import type { ViewNode } from "../scene/view-node.ts";

export function syncLayoutFromYoga(node: ViewNode): void {
  if (!node.yogaMounted) {
    for (const c of node.children) syncLayoutFromYoga(c as ViewNode);
    return;
  }
  const l = node.yogaNode.getComputedLayout();
  node.layout = {
    left: l.left,
    top: l.top,
    width: l.width,
    height: l.height,
  };
  for (const c of node.children) syncLayoutFromYoga(c as ViewNode);
}

function clampScrollViewsAfterLayout(node: ViewNode): void {
  if (node.type === "ScrollView") {
    (node as ViewNode & { clampScrollOffsetsAfterLayout(): void }).clampScrollOffsetsAfterLayout();
  }
  for (const c of node.children) {
    clampScrollViewsAfterLayout(c as ViewNode);
  }
}

/** Root-only: runs Yoga layout then copies computed boxes onto each ViewNode. */
export function calculateLayoutRoot(
  root: ViewNode,
  width: number,
  height: number,
  direction: Direction,
  canvasKit?: CanvasKit | null,
): void {
  setLayoutCanvasKit(canvasKit ?? null);
  try {
    root.yogaNode.calculateLayout(width, height, direction);
    syncLayoutFromYoga(root);
    clampScrollViewsAfterLayout(root);
  } finally {
    clearLayoutCanvasKit();
  }
}

export function isDisplayNone(node: ViewNode): boolean {
  if (!node.yogaMounted) {
    return false;
  }
  if (node.props.display === "none") return true;
  return node.yogaNode.getDisplay() === Display.None;
}
