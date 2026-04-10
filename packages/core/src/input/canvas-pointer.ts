import type { CanvasKit } from "canvaskit-wasm";

import { shouldEmitClick, type PointerDownSnapshot } from "./click.ts";
import { dispatchBubble } from "./dispatch.ts";
import {
  buildPathToRoot,
  hitTest,
  hitTestAmongLayers,
  hitTestScrollViewVerticalScrollbar,
  type LayerHitEntry,
} from "./hit-test.ts";
import { diffHoverEnterLeave, dispatchPointerEnterLeave } from "./hover.ts";
import type { ViewportCamera } from "../render/camera.ts";
import { getVerticalScrollMetrics, type ScrollViewNode } from "../scene/scroll-view-node.ts";
import type { ViewNode } from "../scene/view-node.ts";
import type { CursorManager } from "./cursor-manager.ts";
import { applyWheelToScrollViewChain } from "./scroll-chain.ts";

/** 与 {@link Stage.setPointerCapture} 配合：对处于捕获的 `pointerId` 跳过命中测试。 */
export type CanvasPointerCaptureBinding = {
  getTarget: (pointerId: number) => ViewNode | undefined;
  /** 在 `pointerup` / `pointercancel` 分发后调用，清除该 `pointerId` 的捕获。 */
  release: (pointerId: number) => void;
};

/**
 * 与 `core-design.md` §14 一致：焦点、`ViewNode` 的 `hovered` / `pressed` 合成态。
 * {@link Stage.attachPointerHandlers} 会注入默认实现。
 */
export type CanvasPointerInteractionBinding = {
  /** `pointerdown` 命中结果（含 `null` 表示画布空白处，应失焦）。 */
  onPointerDownHit?: (hit: ViewNode | null) => void;
  /**
   * 在派发 `pointerenter` / `pointerleave` 之后调用，用于同步 `ViewNode.applyInteractionPatch({ hovered })`。
   * `leave` 为叶→根顺序，`enter` 为根→叶顺序（与 {@link diffHoverEnterLeave} 一致）。
   */
  afterHoverDiff?: (leave: ViewNode[], enter: ViewNode[]) => void;
  onPressBegin?: (target: ViewNode) => void;
  onPressEnd?: (target: ViewNode) => void;
};

function findAncestorScrollView(leaf: ViewNode | null): ScrollViewNode | null {
  let n: ViewNode | null = leaf;
  while (n) {
    if (n.type === "ScrollView") return n as ScrollViewNode;
    if (n.parent === null) break;
    n = n.parent as ViewNode;
  }
  return null;
}

/** 仅当命中点处于某可滚动 `ScrollView` 视口内（沿父链）时显示滚动条；否则隐藏。 */
function syncScrollbarHoverFromHit(
  hit: ViewNode | null,
  lastSv: { current: ScrollViewNode | null },
  requestLayoutPaint: () => void,
): void {
  let next: ScrollViewNode | null = null;
  if (hit) {
    const sv = findAncestorScrollView(hit);
    if (sv && getVerticalScrollMetrics(sv)) next = sv;
  }
  if (next === lastSv.current) return;
  const prev = lastSv.current;
  if (prev) prev.scrollbarHoverVisible = false;
  if (next) next.scrollbarHoverVisible = true;
  lastSv.current = next;
  requestLayoutPaint();
}

/**
 * 自命中叶沿父链查找首个 `props.cursor`，用于同步 `<canvas style="cursor">`。
 */
export function resolveCursorFromHitLeaf(leaf: ViewNode | null, sceneRoot: ViewNode): string {
  let n: ViewNode | null = leaf;
  while (n) {
    const c = n.props.cursor;
    if (typeof c === "string" && c.length > 0) return c;
    if (n === sceneRoot) break;
    n = n.parent as ViewNode | null;
  }
  return "default";
}

function syncCanvasCursor(
  canvas: HTMLCanvasElement,
  leaf: ViewNode | null,
  layerRoot: ViewNode,
  cursorManager?: CursorManager,
): void {
  const fromNode = resolveCursorFromHitLeaf(leaf, layerRoot);
  if (cursorManager) {
    cursorManager.setFromNode(fromNode);
    canvas.style.cursor = cursorManager.resolve();
  } else {
    canvas.style.cursor = fromNode;
  }
}

/**
 * {@link attachCanvasPointerHandlers} 的 `sceneRoot`：静态根、根数组，或**每次命中时**调用的 getter
 *（用于 `Stage` 在 `modalLayer.visible` 等变化后仍参与命中，避免层列表快照过期）。
 * 支持 `LayerHitEntry[]` 以携带 `captureEvents` 信息。
 */
export type CanvasSceneRootsInput =
  | ViewNode
  | ViewNode[]
  | LayerHitEntry[]
  | (() => ViewNode | ViewNode[] | LayerHitEntry[]);

function isLayerHitEntryArray(arr: unknown[]): arr is LayerHitEntry[] {
  return arr.length > 0 && typeof (arr[0] as LayerHitEntry).root === "object";
}

function normalizeCanvasSceneRoots(input: CanvasSceneRootsInput): ViewNode[] {
  const r = typeof input === "function" ? input() : input;
  if (!Array.isArray(r)) return [r];
  if (isLayerHitEntryArray(r)) return r.map((e) => e.root);
  return r;
}

function normalizeCanvasSceneEntries(input: CanvasSceneRootsInput): LayerHitEntry[] {
  const r = typeof input === "function" ? input() : input;
  if (!Array.isArray(r)) return [{ root: r, captureEvents: false }];
  if (isLayerHitEntryArray(r)) return r;
  return r.map((root) => ({ root, captureEvents: false }));
}

/** 子树所在 Layer 的根（沿 parent 上至顶层）。 */
function subtreeLayerRoot(node: ViewNode): ViewNode {
  let n: ViewNode = node;
  while (n.parent) n = n.parent as ViewNode;
  return n;
}

/**
 * Map DOM `clientX/Y` to canvas **logical** coordinates (same space as `ViewNode.layout`).
 */
export function clientToCanvasLogical(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const rw = rect.width || 1;
  const rh = rect.height || 1;
  return {
    x: ((clientX - rect.left) * logicalWidth) / rw,
    y: ((clientY - rect.top) * logicalHeight) / rh,
  };
}

/**
 * Registers `pointerdown` on `canvas`; `pointermove` on `document` (for hover + move outside canvas);
 * `pointerup` / `pointercancel` on `document`。
 *
 * `requestLayoutPaint`：在仅改变 `ScrollView` 的 `scrollX`/`scrollY` 时触发与 `queueLayoutPaintFrame` 一致的重绘。
 *
 * `sceneRoot` 可为多个 **Layer 根**（顺序与 `Stage` 可见层一致：zIndex 升序），命中自顶向下（modal 优先）；
 * 单根时行为与原先一致。亦可传入 `() => roots`，使可见层集合随运行时变化（例如弹窗层 `visible`）。
 */
export function attachCanvasPointerHandlers(
  canvas: HTMLCanvasElement,
  sceneRoot: CanvasSceneRootsInput,
  logicalWidth: number,
  logicalHeight: number,
  canvasKit: CanvasKit,
  requestLayoutPaint: () => void,
  getCamera?: () => ViewportCamera | null,
  pointerCapture?: CanvasPointerCaptureBinding,
  interaction?: CanvasPointerInteractionBinding,
  cursorManager?: CursorManager,
): () => void {
  const readCamera = (): ViewportCamera | null => getCamera?.() ?? null;

  const pickHit = (pageX: number, pageY: number): { hit: ViewNode; layerRoot: ViewNode } | null => {
    const entries = normalizeCanvasSceneEntries(sceneRoot);
    if (entries.length === 1 && !entries[0]!.captureEvents) {
      const h = hitTest(entries[0]!.root, pageX, pageY, canvasKit, readCamera());
      return h ? { hit: h, layerRoot: entries[0]!.root } : null;
    }
    return hitTestAmongLayers(entries, pageX, pageY, canvasKit, readCamera());
  };

  const pickScrollbar = (pageX: number, pageY: number): ScrollViewNode | null => {
    const entries = normalizeCanvasSceneEntries(sceneRoot);
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]!;
      const sb = hitTestScrollViewVerticalScrollbar(
        entry.root,
        pageX,
        pageY,
        canvasKit,
        readCamera(),
      );
      if (sb) return sb;
      if (entry.captureEvents) return null;
    }
    return null;
  };

  const down = new Map<number, PointerDownSnapshot>();
  /** 仅在**垂直滚动条轨道**上按下时拖拽改变 `scrollY`（列表体不再拖拽滚动）。 */
  const scrollBarDrag = new Map<number, { node: ScrollViewNode; lastPageY: number }>();
  /** Deepest hit under the mouse for hover (mouse / pen only). */
  let hoverLeaf: ViewNode | null = null;
  let lastPage = { x: 0, y: 0 };
  const lastScrollbarHoverSv = { current: null as ScrollViewNode | null };

  const route = (ev: PointerEvent) =>
    clientToCanvasLogical(ev.clientX, ev.clientY, canvas, logicalWidth, logicalHeight);

  const isMouseLikePointer = (ev: PointerEvent): boolean =>
    ev.pointerType === "mouse" || ev.pointerType === "pen" || ev.pointerType === "";

  /** 上一次 hover 所在的层根（多层 hover diff 需要按层根做路径查找）。 */
  let hoverLayerRoot: ViewNode | null = null;

  const syncHoverInsideCanvas = (ev: PointerEvent) => {
    const roots = normalizeCanvasSceneRoots(sceneRoot);
    const primaryRoot = roots[0]!;
    const { x: pageX, y: pageY } = route(ev);
    lastPage = { x: pageX, y: pageY };

    const picked = pickHit(pageX, pageY);
    const hit = picked?.hit ?? null;
    syncScrollbarHoverFromHit(hit, lastScrollbarHoverSv, requestLayoutPaint);
    if (hit && picked) {
      const path = buildPathToRoot(hit, picked.layerRoot);
      dispatchBubble(
        path,
        picked.layerRoot,
        "pointermove",
        pageX,
        pageY,
        ev.pointerId,
        ev.timeStamp,
      );
    }

    if (isMouseLikePointer(ev)) {
      if (hoverLeaf === hit) {
        syncCanvasCursor(canvas, hoverLeaf, picked?.layerRoot ?? primaryRoot, cursorManager);
        return;
      }

      const prevLayerRoot = hoverLayerRoot ?? primaryRoot;
      const nextLayerRoot = picked?.layerRoot ?? primaryRoot;
      const crossLayer = prevLayerRoot !== nextLayerRoot;

      // Cross-layer: leave all in old layer, enter all in new layer
      let leave: ViewNode[] = [];
      let enter: ViewNode[] = [];
      if (crossLayer) {
        if (hoverLeaf) {
          const prevPath = buildPathToRoot(hoverLeaf, prevLayerRoot);
          leave = prevPath.slice().reverse(); // leaf → root
        }
        if (hit) {
          enter = buildPathToRoot(hit, nextLayerRoot); // root → leaf
        }
      } else {
        const diff = diffHoverEnterLeave(hoverLeaf, hit, nextLayerRoot);
        leave = diff.leave;
        enter = diff.enter;
      }

      for (const n of leave) {
        dispatchPointerEnterLeave(
          prevLayerRoot,
          "pointerleave",
          n,
          pageX,
          pageY,
          ev.pointerId,
          ev.timeStamp,
        );
      }
      for (const n of enter) {
        dispatchPointerEnterLeave(
          nextLayerRoot,
          "pointerenter",
          n,
          pageX,
          pageY,
          ev.pointerId,
          ev.timeStamp,
        );
      }
      interaction?.afterHoverDiff?.(leave, enter);
      hoverLeaf = hit;
      hoverLayerRoot = nextLayerRoot;
      syncCanvasCursor(canvas, hoverLeaf, nextLayerRoot, cursorManager);
    }
  };

  const onPointerDown = (ev: PointerEvent) => {
    const { x: pageX, y: pageY } = route(ev);
    const picked = pickHit(pageX, pageY);
    if (!picked) {
      syncScrollbarHoverFromHit(null, lastScrollbarHoverSv, requestLayoutPaint);
      interaction?.onPointerDownHit?.(null);
      return;
    }
    const { hit, layerRoot } = picked;
    syncScrollbarHoverFromHit(hit, lastScrollbarHoverSv, requestLayoutPaint);
    interaction?.onPointerDownHit?.(hit);
    interaction?.onPressBegin?.(hit);
    down.set(ev.pointerId, { pageX, pageY, target: hit });
    const scrollbarSv = pickScrollbar(pageX, pageY);
    if (scrollbarSv) {
      scrollBarDrag.set(ev.pointerId, { node: scrollbarSv, lastPageY: pageY });
    }
    const path = buildPathToRoot(hit, layerRoot);
    dispatchBubble(path, layerRoot, "pointerdown", pageX, pageY, ev.pointerId, ev.timeStamp);
  };

  const onPointerMove = (ev: PointerEvent) => {
    const barDrag = scrollBarDrag.get(ev.pointerId);
    if (barDrag) {
      const { y: pageY } = route(ev);
      const deltaY = pageY - barDrag.lastPageY;
      const m = getVerticalScrollMetrics(barDrag.node);
      if (m) {
        const travel = Math.max(0, m.trackH - m.thumbH);
        if (travel > 0) {
          barDrag.node.scrollY += (deltaY / travel) * m.maxScrollY;
        } else {
          barDrag.node.scrollY += deltaY;
        }
        barDrag.node.clampScrollOffsetsAfterLayout();
      }
      barDrag.lastPageY = pageY;
      requestLayoutPaint();
      return;
    }

    const capNode = pointerCapture?.getTarget(ev.pointerId);
    if (capNode) {
      const { x: pageX, y: pageY } = route(ev);
      lastPage = { x: pageX, y: pageY };
      const capRoot = subtreeLayerRoot(capNode);
      const path = buildPathToRoot(capNode, capRoot);
      dispatchBubble(path, capRoot, "pointermove", pageX, pageY, ev.pointerId, ev.timeStamp);
      syncCanvasCursor(canvas, capNode, capRoot, cursorManager);
      return;
    }

    const r = canvas.getBoundingClientRect();
    const inside =
      ev.clientX >= r.left && ev.clientX < r.right && ev.clientY >= r.top && ev.clientY < r.bottom;

    if (!inside) {
      const primaryRoot = normalizeCanvasSceneRoots(sceneRoot)[0]!;
      syncScrollbarHoverFromHit(null, lastScrollbarHoverSv, requestLayoutPaint);
      if (isMouseLikePointer(ev)) {
        const prevRoot = hoverLayerRoot ?? primaryRoot;
        // When leaving canvas, leave all hovered nodes in the current layer
        let leave: ViewNode[] = [];
        if (hoverLeaf) {
          const prevPath = buildPathToRoot(hoverLeaf, prevRoot);
          leave = prevPath.slice().reverse();
        }
        for (const n of leave) {
          dispatchPointerEnterLeave(
            prevRoot,
            "pointerleave",
            n,
            lastPage.x,
            lastPage.y,
            ev.pointerId,
            ev.timeStamp,
          );
        }
        interaction?.afterHoverDiff?.(leave, []);
        hoverLeaf = null;
        hoverLayerRoot = null;
        syncCanvasCursor(canvas, hoverLeaf, primaryRoot, cursorManager);
      }
      return;
    }

    syncHoverInsideCanvas(ev);
  };

  const onPointerUpOrCancel = (ev: PointerEvent) => {
    scrollBarDrag.delete(ev.pointerId);
    const { x: pageX, y: pageY } = route(ev);
    const snap = down.get(ev.pointerId);
    down.delete(ev.pointerId);
    if (snap) {
      interaction?.onPressEnd?.(snap.target);
    }

    const kind: "pointerup" | "pointercancel" =
      ev.type === "pointercancel" ? "pointercancel" : "pointerup";

    const capNode = pointerCapture?.getTarget(ev.pointerId);
    let endRoot: ViewNode = normalizeCanvasSceneRoots(sceneRoot)[0]!;
    let pathForEnd: ViewNode[] | null = null;
    if (capNode) {
      endRoot = subtreeLayerRoot(capNode);
      pathForEnd = buildPathToRoot(capNode, endRoot);
    } else {
      const pickedEnd = pickHit(pageX, pageY);
      if (pickedEnd) {
        endRoot = pickedEnd.layerRoot;
        pathForEnd = buildPathToRoot(pickedEnd.hit, endRoot);
      } else if (snap) {
        endRoot = subtreeLayerRoot(snap.target);
        pathForEnd = buildPathToRoot(snap.target, endRoot);
      }
    }
    if (pathForEnd) {
      dispatchBubble(pathForEnd, endRoot, kind, pageX, pageY, ev.pointerId, ev.timeStamp);
    }

    pointerCapture?.release(ev.pointerId);

    /**
     * 抬起后若指针未移动，document 不会再次派发 pointermove；而业务在 onPointerUp 里释放
     * plugin 光标后必须立刻按当前命中重算 {@link CursorManager}，否则 canvas.style.cursor 会卡在 grabbing。
     */
    const rUp = canvas.getBoundingClientRect();
    const insideUp =
      ev.clientX >= rUp.left &&
      ev.clientX < rUp.right &&
      ev.clientY >= rUp.top &&
      ev.clientY < rUp.bottom;
    if (insideUp && isMouseLikePointer(ev)) {
      const pickedUp = pickHit(pageX, pageY);
      const primaryRoot = normalizeCanvasSceneRoots(sceneRoot)[0]!;
      syncCanvasCursor(
        canvas,
        pickedUp?.hit ?? null,
        pickedUp?.layerRoot ?? primaryRoot,
        cursorManager,
      );
    }

    if (kind === "pointercancel" || !snap) return;
    if (
      shouldEmitClick(
        snap,
        pageX,
        pageY,
        normalizeCanvasSceneRoots(sceneRoot),
        canvasKit,
        undefined,
        readCamera(),
      )
    ) {
      const clickRoot = subtreeLayerRoot(snap.target);
      const pathClick = buildPathToRoot(snap.target, clickRoot);
      dispatchBubble(pathClick, clickRoot, "click", pageX, pageY, ev.pointerId, ev.timeStamp);
    }
  };

  const onWheel = (ev: WheelEvent) => {
    /** Cmd/Ctrl+滚轮留给 `@react-canvas/plugin-viewport` 等视口缩放，ScrollView 不消费。 */
    if (ev.metaKey || ev.ctrlKey) return;
    const { x: pageX, y: pageY } = clientToCanvasLogical(
      ev.clientX,
      ev.clientY,
      canvas,
      logicalWidth,
      logicalHeight,
    );
    const picked = pickHit(pageX, pageY);
    const hit = picked?.hit ?? null;
    syncScrollbarHoverFromHit(hit, lastScrollbarHoverSv, requestLayoutPaint);
    if (!hit) return;
    const { inScrollView, didScroll } = applyWheelToScrollViewChain(hit, ev.deltaX, ev.deltaY);
    if (!inScrollView) return;
    ev.preventDefault();
    if (didScroll) requestLayoutPaint();
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUpOrCancel);
  document.addEventListener("pointercancel", onPointerUpOrCancel);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUpOrCancel);
    document.removeEventListener("pointercancel", onPointerUpOrCancel);
    canvas.removeEventListener("wheel", onWheel);
    cursorManager?.reset();
    canvas.style.cursor = "";
  };
}
