import type { ViewNode } from "./view-node.ts";

/**
 * Top-left of `node`'s layout box in coordinates relative to `sceneRoot` (logical px).
 * Walks `parent` until `sceneRoot` (exclusive of root offset — root's children are in root space).
 */
export function getWorldOffset(node: ViewNode, sceneRoot: ViewNode): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let cur: ViewNode | null = node;
  while (cur !== null && cur !== sceneRoot) {
    x += cur.layout.left;
    y += cur.layout.top;
    cur = cur.parent;
  }
  return { x, y };
}

export function getWorldBounds(
  node: ViewNode,
  sceneRoot: ViewNode,
): { left: number; top: number; width: number; height: number } {
  const { x, y } = getWorldOffset(node, sceneRoot);
  return {
    left: x,
    top: y,
    width: node.layout.width,
    height: node.layout.height,
  };
}

export function containsPagePoint(
  node: ViewNode,
  sceneRoot: ViewNode,
  pageX: number,
  pageY: number,
): boolean {
  const b = getWorldBounds(node, sceneRoot);
  return pageX >= b.left && pageY >= b.top && pageX < b.left + b.width && pageY < b.top + b.height;
}
