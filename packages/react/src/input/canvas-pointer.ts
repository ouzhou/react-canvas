import {
  buildPathToRoot,
  diffHoverEnterLeave,
  dispatchBubble,
  dispatchPointerEnterLeave,
  getVerticalScrollMetrics,
  hitTest,
  hitTestScrollViewVerticalScrollbar,
  shouldEmitClick,
  type CanvasKit,
  type PointerDownSnapshot,
  type ScrollViewNode,
  type ViewNode,
  type ViewportCamera,
} from "@react-canvas/core";

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
function resolveCursorFromHitLeaf(leaf: ViewNode | null, sceneRoot: ViewNode): string {
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
  sceneRoot: ViewNode,
): void {
  canvas.style.cursor = resolveCursorFromHitLeaf(leaf, sceneRoot);
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
 */
export function attachCanvasPointerHandlers(
  canvas: HTMLCanvasElement,
  sceneRoot: ViewNode,
  logicalWidth: number,
  logicalHeight: number,
  canvasKit: CanvasKit,
  requestLayoutPaint: () => void,
  getCamera?: () => ViewportCamera | null,
): () => void {
  const readCamera = (): ViewportCamera | null => getCamera?.() ?? null;
  const down = new Map<number, PointerDownSnapshot>();
  /** 仅在**垂直滚动条轨道**上按下时拖拽改变 `scrollY`（列表体不再拖拽滚动）。 */
  const scrollBarDrag = new Map<number, { node: ScrollViewNode; lastPageY: number }>();
  /** Deepest hit under the mouse for hover (mouse / pen only). */
  let hoverLeaf: ViewNode | null = null;
  let lastPage = { x: 0, y: 0 };
  const lastScrollbarHoverSv = { current: null as ScrollViewNode | null };

  const route = (ev: PointerEvent) =>
    clientToCanvasLogical(ev.clientX, ev.clientY, canvas, logicalWidth, logicalHeight);

  const onPointerDown = (ev: PointerEvent) => {
    const { x: pageX, y: pageY } = route(ev);
    const hit = hitTest(sceneRoot, pageX, pageY, canvasKit, readCamera());
    if (!hit) {
      syncScrollbarHoverFromHit(null, lastScrollbarHoverSv, requestLayoutPaint);
      return;
    }
    syncScrollbarHoverFromHit(hit, lastScrollbarHoverSv, requestLayoutPaint);
    down.set(ev.pointerId, { pageX, pageY, target: hit });
    const scrollbarSv = hitTestScrollViewVerticalScrollbar(
      sceneRoot,
      pageX,
      pageY,
      canvasKit,
      readCamera(),
    );
    if (scrollbarSv) {
      scrollBarDrag.set(ev.pointerId, { node: scrollbarSv, lastPageY: pageY });
    }
    const path = buildPathToRoot(hit, sceneRoot);
    dispatchBubble(path, sceneRoot, "pointerdown", pageX, pageY, ev.pointerId, ev.timeStamp);
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

    const r = canvas.getBoundingClientRect();
    const inside =
      ev.clientX >= r.left && ev.clientX < r.right && ev.clientY >= r.top && ev.clientY < r.bottom;

    if (!inside) {
      syncScrollbarHoverFromHit(null, lastScrollbarHoverSv, requestLayoutPaint);
      if (ev.pointerType === "mouse" || ev.pointerType === "pen") {
        if (hoverLeaf !== null) {
          const { leave } = diffHoverEnterLeave(hoverLeaf, null, sceneRoot);
          for (const n of leave) {
            dispatchPointerEnterLeave(
              sceneRoot,
              "pointerleave",
              n,
              lastPage.x,
              lastPage.y,
              ev.pointerId,
              ev.timeStamp,
            );
          }
          hoverLeaf = null;
          syncCanvasCursor(canvas, hoverLeaf, sceneRoot);
        }
      }
      return;
    }

    const { x: pageX, y: pageY } = route(ev);
    lastPage = { x: pageX, y: pageY };

    const hit = hitTest(sceneRoot, pageX, pageY, canvasKit, readCamera());
    syncScrollbarHoverFromHit(hit, lastScrollbarHoverSv, requestLayoutPaint);
    if (hit) {
      const path = buildPathToRoot(hit, sceneRoot);
      dispatchBubble(path, sceneRoot, "pointermove", pageX, pageY, ev.pointerId, ev.timeStamp);
    }

    if (ev.pointerType === "mouse" || ev.pointerType === "pen") {
      if (hoverLeaf === hit) return;
      const { leave, enter } = diffHoverEnterLeave(hoverLeaf, hit, sceneRoot);
      for (const n of leave) {
        dispatchPointerEnterLeave(
          sceneRoot,
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
          sceneRoot,
          "pointerenter",
          n,
          pageX,
          pageY,
          ev.pointerId,
          ev.timeStamp,
        );
      }
      hoverLeaf = hit;
      syncCanvasCursor(canvas, hoverLeaf, sceneRoot);
    }
  };

  const onPointerUpOrCancel = (ev: PointerEvent) => {
    scrollBarDrag.delete(ev.pointerId);
    const { x: pageX, y: pageY } = route(ev);
    const snap = down.get(ev.pointerId);
    down.delete(ev.pointerId);

    const kind: "pointerup" | "pointercancel" =
      ev.type === "pointercancel" ? "pointercancel" : "pointerup";

    const hit = hitTest(sceneRoot, pageX, pageY, canvasKit, readCamera());
    const pathForEnd = hit
      ? buildPathToRoot(hit, sceneRoot)
      : snap
        ? buildPathToRoot(snap.target, sceneRoot)
        : null;
    if (pathForEnd) {
      dispatchBubble(pathForEnd, sceneRoot, kind, pageX, pageY, ev.pointerId, ev.timeStamp);
    }

    if (kind === "pointercancel" || !snap) return;
    if (shouldEmitClick(snap, pageX, pageY, sceneRoot, canvasKit, undefined, readCamera())) {
      const pathClick = buildPathToRoot(snap.target, sceneRoot);
      dispatchBubble(pathClick, sceneRoot, "click", pageX, pageY, ev.pointerId, ev.timeStamp);
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
    const hit = hitTest(sceneRoot, pageX, pageY, canvasKit, readCamera());
    syncScrollbarHoverFromHit(hit, lastScrollbarHoverSv, requestLayoutPaint);
    if (!hit) return;
    const sv = findAncestorScrollView(hit);
    if (!sv) return;
    ev.preventDefault();
    sv.scrollY += ev.deltaY;
    sv.clampScrollOffsetsAfterLayout();
    requestLayoutPaint();
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
    canvas.style.cursor = "";
  };
}
