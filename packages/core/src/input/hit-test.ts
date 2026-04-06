import type { CanvasKit } from "canvaskit-wasm";
import { getSortedChildrenForPaint } from "../render/children-z-order.ts";
import { buildLocalTransformMatrix } from "../render/transform.ts";
import { isDisplayNone } from "../layout/layout.ts";
import type { TextNode } from "../scene/text-node.ts";
import type { ViewNode } from "../scene/view-node.ts";

function pointInRect(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  if (w <= 0 || h <= 0) return false;
  return px >= x && py >= y && px < x + w && py < y + h;
}

/**
 * Deepest scene node under `(pageX, pageY)` in scene-root logical coordinates.
 * Children are tested in **reverse paint order**（含 `zIndex` 排序）以与 `paintNode` 一致。
 * 与绘制一致：`world = parent * translate(layout) * localTransform`。
 *
 * For `TextNode`, nested inner `<Text>` nodes do not have separate layout boxes; only the
 * outer Text host is hittable (see `paint.ts` — Text returns before recursing children).
 */
export function hitTest(
  sceneRoot: ViewNode,
  pageX: number,
  pageY: number,
  canvasKit: CanvasKit,
): ViewNode | null {
  return hitTestRecursive(sceneRoot, pageX, pageY, canvasKit, canvasKit.Matrix.identity());
}

function hitTestRecursive(
  node: ViewNode,
  pageX: number,
  pageY: number,
  canvasKit: CanvasKit,
  parentWorld: number[],
): ViewNode | null {
  if (isDisplayNone(node)) return null;

  const lx = node.layout.left;
  const ly = node.layout.top;
  const w = node.layout.width;
  const h = node.layout.height;

  const localT = buildLocalTransformMatrix(canvasKit, w, h, node.props.transform);
  const incremental = canvasKit.Matrix.multiply(canvasKit.Matrix.translated(lx, ly), localT);
  const world = canvasKit.Matrix.multiply(parentWorld, incremental);
  const inv = canvasKit.Matrix.invert(world);
  if (!inv) return null;

  const pts = [pageX, pageY];
  canvasKit.Matrix.mapPoints(inv, pts);
  const localX = pts[0]!;
  const localY = pts[1]!;

  if (node.type === "Text") {
    if (!pointInRect(localX, localY, 0, 0, w, h)) return null;
    return node as TextNode;
  }

  const ordered = getSortedChildrenForPaint(node);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const c = ordered[i]!;
    const hit = hitTestRecursive(c as ViewNode, pageX, pageY, canvasKit, world);
    if (hit) return hit;
  }

  if (pointInRect(localX, localY, 0, 0, w, h)) return node;
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
