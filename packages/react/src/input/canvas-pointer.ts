import {
  buildPathToRoot,
  diffHoverEnterLeave,
  dispatchBubble,
  dispatchPointerEnterLeave,
  hitTest,
  shouldEmitClick,
  type CanvasKit,
  type PointerDownSnapshot,
  type ScrollViewNode,
  type ViewNode,
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
): () => void {
  const down = new Map<number, PointerDownSnapshot>();
  /** 在 `ScrollView` 视口内按下时拖拽滚动（pointerId → 状态）。 */
  const scrollDrag = new Map<number, { node: ScrollViewNode; lastPageY: number }>();
  /** Deepest hit under the mouse for hover (mouse / pen only). */
  let hoverLeaf: ViewNode | null = null;
  let lastPage = { x: 0, y: 0 };

  const route = (ev: PointerEvent) =>
    clientToCanvasLogical(ev.clientX, ev.clientY, canvas, logicalWidth, logicalHeight);

  const onPointerDown = (ev: PointerEvent) => {
    const { x: pageX, y: pageY } = route(ev);
    const hit = hitTest(sceneRoot, pageX, pageY, canvasKit);
    if (!hit) return;
    down.set(ev.pointerId, { pageX, pageY, target: hit });
    const sv = findAncestorScrollView(hit);
    if (sv) {
      scrollDrag.set(ev.pointerId, { node: sv, lastPageY: pageY });
    }
    const path = buildPathToRoot(hit, sceneRoot);
    dispatchBubble(path, sceneRoot, "pointerdown", pageX, pageY, ev.pointerId, ev.timeStamp);
  };

  const onPointerMove = (ev: PointerEvent) => {
    const drag = scrollDrag.get(ev.pointerId);
    if (drag) {
      const { y: pageY } = route(ev);
      const deltaY = pageY - drag.lastPageY;
      drag.node.scrollY += deltaY;
      drag.node.clampScrollOffsetsAfterLayout();
      drag.lastPageY = pageY;
      requestLayoutPaint();
      return;
    }

    const r = canvas.getBoundingClientRect();
    const inside =
      ev.clientX >= r.left && ev.clientX < r.right && ev.clientY >= r.top && ev.clientY < r.bottom;

    if (!inside) {
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

    const hit = hitTest(sceneRoot, pageX, pageY, canvasKit);
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
    scrollDrag.delete(ev.pointerId);
    const { x: pageX, y: pageY } = route(ev);
    const snap = down.get(ev.pointerId);
    down.delete(ev.pointerId);

    const kind: "pointerup" | "pointercancel" =
      ev.type === "pointercancel" ? "pointercancel" : "pointerup";

    const hit = hitTest(sceneRoot, pageX, pageY, canvasKit);
    const pathForEnd = hit
      ? buildPathToRoot(hit, sceneRoot)
      : snap
        ? buildPathToRoot(snap.target, sceneRoot)
        : null;
    if (pathForEnd) {
      dispatchBubble(pathForEnd, sceneRoot, kind, pageX, pageY, ev.pointerId, ev.timeStamp);
    }

    if (kind === "pointercancel" || !snap) return;
    if (shouldEmitClick(snap, pageX, pageY, sceneRoot, canvasKit)) {
      const pathClick = buildPathToRoot(snap.target, sceneRoot);
      dispatchBubble(pathClick, sceneRoot, "click", pageX, pageY, ev.pointerId, ev.timeStamp);
    }
  };

  const onWheel = (ev: WheelEvent) => {
    const { x: pageX, y: pageY } = clientToCanvasLogical(
      ev.clientX,
      ev.clientY,
      canvas,
      logicalWidth,
      logicalHeight,
    );
    const hit = hitTest(sceneRoot, pageX, pageY, canvasKit);
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
