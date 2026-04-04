import type { Direction } from "yoga-layout/load";
import { Display } from "yoga-layout/load";
import type { ViewNode } from "./view-node.ts";

export function syncLayoutFromYoga(node: ViewNode): void {
  const l = node.yogaNode.getComputedLayout();
  node.layout = {
    left: l.left,
    top: l.top,
    width: l.width,
    height: l.height,
  };
  for (const c of node.children) syncLayoutFromYoga(c);
}

/** Root-only: runs Yoga layout then copies computed boxes onto each ViewNode. */
export function calculateLayoutRoot(
  root: ViewNode,
  width: number,
  height: number,
  direction: Direction,
): void {
  root.yogaNode.calculateLayout(width, height, direction);
  syncLayoutFromYoga(root);
}

export function isDisplayNone(node: ViewNode): boolean {
  if (node.props.display === "none") return true;
  return node.yogaNode.getDisplay() === Display.None;
}
