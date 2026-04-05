import { isDisplayNone } from "./layout.ts";
import type { TextNode } from "./text-node.ts";
import type { ViewNode } from "./view-node.ts";

function pointInRect(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  if (w <= 0 || h <= 0) return false;
  return px >= x && py >= y && px < x + w && py < y + h;
}

/**
 * Deepest scene node under `(pageX, pageY)` in scene-root logical coordinates.
 * Children are tested in **reverse** order to match `paintNode` (last sibling paints on top).
 *
 * For `TextNode`, nested inner `<Text>` nodes do not have separate layout boxes; only the
 * outer Text host is hittable (see `paint.ts` — Text returns before recursing children).
 */
export function hitTest(sceneRoot: ViewNode, pageX: number, pageY: number): ViewNode | null {
  return hitTestRecursive(sceneRoot, pageX, pageY, 0, 0);
}

function hitTestRecursive(
  node: ViewNode,
  pageX: number,
  pageY: number,
  offsetX: number,
  offsetY: number,
): ViewNode | null {
  if (isDisplayNone(node)) return null;

  const x = offsetX + node.layout.left;
  const y = offsetY + node.layout.top;
  const w = node.layout.width;
  const h = node.layout.height;

  if (node.type === "Text") {
    if (!pointInRect(pageX, pageY, x, y, w, h)) return null;
    return node as TextNode;
  }

  for (let i = node.children.length - 1; i >= 0; i--) {
    const c = node.children[i]!;
    const hit = hitTestRecursive(c as ViewNode, pageX, pageY, x, y);
    if (hit) return hit;
  }

  if (pointInRect(pageX, pageY, x, y, w, h)) return node;
  return null;
}

/** Path from `sceneRoot` (inclusive) to `target` (inclusive). */
export function buildPathToRoot(target: ViewNode, sceneRoot: ViewNode): ViewNode[] {
  const rev: ViewNode[] = [];
  let cur: ViewNode | null = target;
  while (cur !== null) {
    rev.push(cur);
    if (cur === sceneRoot) break;
    cur = cur.parent;
  }
  if (rev.length === 0 || rev[rev.length - 1] !== sceneRoot) {
    throw new Error("[react-canvas] hit path: target is not under sceneRoot.");
  }
  return rev.reverse();
}
