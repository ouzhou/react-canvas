import {
  buildPathToRoot,
  diffHoverEnterLeave,
  dispatchBubble,
  dispatchPointerEnterLeave,
  hitTest,
  shouldEmitClick,
  type PointerDownSnapshot,
  type ViewNode,
} from "@react-canvas/core";

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
 * `pointerup` / `pointercancel` on `document`.
 */
export function attachCanvasPointerHandlers(
  canvas: HTMLCanvasElement,
  sceneRoot: ViewNode,
  logicalWidth: number,
  logicalHeight: number,
): () => void {
  const down = new Map<number, PointerDownSnapshot>();
  /** Deepest hit under the mouse for hover (mouse / pen only). */
  let hoverLeaf: ViewNode | null = null;
  let lastPage = { x: 0, y: 0 };

  const route = (ev: PointerEvent) =>
    clientToCanvasLogical(ev.clientX, ev.clientY, canvas, logicalWidth, logicalHeight);

  const onPointerDown = (ev: PointerEvent) => {
    const { x: pageX, y: pageY } = route(ev);
    const hit = hitTest(sceneRoot, pageX, pageY);
    if (!hit) return;
    down.set(ev.pointerId, { pageX, pageY, target: hit });
    const path = buildPathToRoot(hit, sceneRoot);
    dispatchBubble(path, sceneRoot, "pointerdown", pageX, pageY, ev.pointerId, ev.timeStamp);
  };

  const onPointerMove = (ev: PointerEvent) => {
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
        }
      }
      return;
    }

    const { x: pageX, y: pageY } = route(ev);
    lastPage = { x: pageX, y: pageY };

    const hit = hitTest(sceneRoot, pageX, pageY);
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
    }
  };

  const onPointerUpOrCancel = (ev: PointerEvent) => {
    const { x: pageX, y: pageY } = route(ev);
    const snap = down.get(ev.pointerId);
    down.delete(ev.pointerId);

    const kind: "pointerup" | "pointercancel" =
      ev.type === "pointercancel" ? "pointercancel" : "pointerup";

    const hit = hitTest(sceneRoot, pageX, pageY);
    const pathForEnd = hit
      ? buildPathToRoot(hit, sceneRoot)
      : snap
        ? buildPathToRoot(snap.target, sceneRoot)
        : null;
    if (pathForEnd) {
      dispatchBubble(pathForEnd, sceneRoot, kind, pageX, pageY, ev.pointerId, ev.timeStamp);
    }

    if (kind === "pointercancel" || !snap) return;
    if (shouldEmitClick(snap, pageX, pageY, sceneRoot)) {
      const pathClick = buildPathToRoot(snap.target, sceneRoot);
      dispatchBubble(pathClick, sceneRoot, "click", pageX, pageY, ev.pointerId, ev.timeStamp);
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUpOrCancel);
  document.addEventListener("pointercancel", onPointerUpOrCancel);

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUpOrCancel);
    document.removeEventListener("pointercancel", onPointerUpOrCancel);
  };
}
