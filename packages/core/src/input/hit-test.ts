import type { CanvasKit } from "canvaskit-wasm";
import { logicalPointFromCameraViewport, type ViewportCamera } from "../render/camera.ts";
import { pointInRoundedRectLocal } from "../geometry/rounded-rect-hit.ts";
import { getSortedChildrenForPaint } from "../render/children-z-order.ts";
import { buildLocalTransformMatrix } from "../render/transform.ts";
import { isDisplayNone } from "../layout/layout.ts";
import type { TextNode } from "../scene/text-node.ts";
import { isLocalPointOnVerticalScrollbar, type ScrollViewNode } from "../scene/scroll-view-node.ts";
import type { ViewNode } from "../scene/view-node.ts";

function pointInRect(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  if (w <= 0 || h <= 0) return false;
  return px >= x && py >= y && px < x + w && py < y + h;
}

/** 与 `paint.ts` 中 `overflow` / `Image`+圆角 的可视区域一致。 */
function localPointHitsNodeBounds(node: ViewNode, localX: number, localY: number): boolean {
  const w = node.layout.width;
  const h = node.layout.height;
  if (w <= 0 || h <= 0) return false;
  const r = node.props.borderRadius ?? 0;
  if (node.props.overflow === "hidden") {
    return pointInRoundedRectLocal(localX, localY, w, h, r);
  }
  if (node.type === "Image" && r > 0) {
    return pointInRoundedRectLocal(localX, localY, w, h, r);
  }
  return pointInRect(localX, localY, 0, 0, w, h);
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
  camera?: ViewportCamera | null,
): ViewNode | null {
  const { x, y } = logicalPointFromCameraViewport(canvasKit, camera, pageX, pageY);
  return hitTestRecursive(sceneRoot, x, y, canvasKit, canvasKit.Matrix.identity());
}

/**
 * 多 {@link Layer} 同画布叠加时，按 zIndex **从高到低** 探测命中（先 modal 再 default），
 * 与 `paintStageLayers` 的遮挡关系一致；`layerRootsLowToHigh` 须为各 Layer 根节点且 **zIndex 升序**（与 Stage 可见层枚举一致）。
 */
export function hitTestAmongLayerRoots(
  layerRootsLowToHigh: readonly ViewNode[],
  pageX: number,
  pageY: number,
  canvasKit: CanvasKit,
  camera?: ViewportCamera | null,
): { hit: ViewNode; layerRoot: ViewNode } | null {
  for (let i = layerRootsLowToHigh.length - 1; i >= 0; i--) {
    const layerRoot = layerRootsLowToHigh[i]!;
    const h = hitTest(layerRoot, pageX, pageY, canvasKit, camera);
    if (h) return { hit: h, layerRoot };
  }
  return null;
}

/** 携带 {@link Layer} 事件元信息的命中测试输入条目。 */
export type LayerHitEntry = {
  root: ViewNode;
  /** `true` 时无论命中与否都阻断向低层传递（Modal 语义）。 */
  captureEvents: boolean;
};

/**
 * 与 {@link hitTestAmongLayerRoots} 功能一致，但额外尊重 `captureEvents`：
 * 当某层的 `captureEvents === true` 时，即使该层未命中也不再向低层继续探测。
 */
export function hitTestAmongLayers(
  layersLowToHigh: readonly LayerHitEntry[],
  pageX: number,
  pageY: number,
  canvasKit: CanvasKit,
  camera?: ViewportCamera | null,
): { hit: ViewNode; layerRoot: ViewNode } | null {
  for (let i = layersLowToHigh.length - 1; i >= 0; i--) {
    const entry = layersLowToHigh[i]!;
    const h = hitTest(entry.root, pageX, pageY, canvasKit, camera);
    if (h) return { hit: h, layerRoot: entry.root };
    if (entry.captureEvents) return null;
  }
  return null;
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

  if (!localPointHitsNodeBounds(node, localX, localY)) {
    return null;
  }

  if (node.type === "Text") {
    if (!pointInRect(localX, localY, 0, 0, w, h)) return null;
    return node as TextNode;
  }

  let worldForChildren = world;
  if (node.type === "ScrollView") {
    const sv = node as ScrollViewNode;
    /** 滚动条叠在内容之上，先于子节点命中。 */
    if (isLocalPointOnVerticalScrollbar(sv, localX, localY)) {
      return node;
    }
    worldForChildren = canvasKit.Matrix.multiply(
      world,
      canvasKit.Matrix.translated(-sv.scrollX, -sv.scrollY),
    );
  }

  const ordered = getSortedChildrenForPaint(node);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const c = ordered[i]!;
    const hit = hitTestRecursive(c as ViewNode, pageX, pageY, canvasKit, worldForChildren);
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

/**
 * 若 `page` 落在某 `ScrollView` 的**垂直滚动条轨道**内，返回该节点（用于仅允许轨道拖拽滚动）。
 * 与绘制顺序一致：滚动条窄条优先于子内容。
 */
export function hitTestScrollViewVerticalScrollbar(
  sceneRoot: ViewNode,
  pageX: number,
  pageY: number,
  canvasKit: CanvasKit,
  camera?: ViewportCamera | null,
): ScrollViewNode | null {
  const { x, y } = logicalPointFromCameraViewport(canvasKit, camera, pageX, pageY);
  return hitTestScrollbarStripRecursive(sceneRoot, x, y, canvasKit, canvasKit.Matrix.identity());
}

function hitTestScrollbarStripRecursive(
  node: ViewNode,
  pageX: number,
  pageY: number,
  canvasKit: CanvasKit,
  parentWorld: number[],
): ScrollViewNode | null {
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

  if (!localPointHitsNodeBounds(node, localX, localY)) {
    return null;
  }

  if (node.type === "Text") {
    return null;
  }

  if (node.type === "ScrollView") {
    const sv = node as ScrollViewNode;
    if (isLocalPointOnVerticalScrollbar(sv, localX, localY)) {
      return sv;
    }
  }

  let worldForChildren = world;
  if (node.type === "ScrollView") {
    const sv = node as ScrollViewNode;
    worldForChildren = canvasKit.Matrix.multiply(
      world,
      canvasKit.Matrix.translated(-sv.scrollX, -sv.scrollY),
    );
  }

  const ordered = getSortedChildrenForPaint(node);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const c = ordered[i]!;
    const hit = hitTestScrollbarStripRecursive(
      c as ViewNode,
      pageX,
      pageY,
      canvasKit,
      worldForChildren,
    );
    if (hit) return hit;
  }

  return null;
}
