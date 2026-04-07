import { clientToCanvasLogical } from "./client-to-logical.ts";
import { panViewport, zoomAtViewportPoint, type ViewportState } from "./viewport-state.ts";

export type SetViewportState = (
  next: ViewportState | ((prev: ViewportState) => ViewportState),
) => void;

export type AttachViewportHandlersOptions = {
  logicalWidth: number;
  logicalHeight: number;
  setState: SetViewportState;
  minScale?: number;
  maxScale?: number;
};

/** Cmd（macOS）/ Ctrl（Windows）按住时允许左键拖拽平移 */
function modifiersDown(ev: PointerEvent | WheelEvent): boolean {
  return ev.metaKey || ev.ctrlKey;
}

function shouldStartPan(ev: PointerEvent): boolean {
  return ev.button === 0 && modifiersDown(ev);
}

/**
 * 在 `canvas` 上注册视口滚轮缩放与 **Cmd/Ctrl + 左键** 平移。
 * 与 `attachCanvasPointerHandlers` 并存时：滚轮仅在 **Cmd/Ctrl 按下** 时由本函数处理（`@react-canvas/react` 已对修饰键滚轮在 ScrollView 分支早退）。
 */
export function attachViewportHandlers(
  canvas: HTMLCanvasElement,
  options: AttachViewportHandlersOptions,
): () => void {
  const { logicalWidth, logicalHeight, setState, minScale = 0.1, maxScale = 8 } = options;

  let panning: { pointerId: number; lastClientX: number; lastClientY: number } | null = null;

  const clearPan = (): void => {
    if (!panning) return;
    const pid = panning.pointerId;
    panning = null;
    try {
      canvas.releasePointerCapture(pid);
    } catch {
      /* ignore */
    }
  };

  const onWheel: EventListener = (ev) => {
    const wev = ev as WheelEvent;
    if (!modifiersDown(wev)) return;
    wev.preventDefault();
    const factor = Math.exp(-wev.deltaY * 0.001);
    const { x: fx, y: fy } = clientToCanvasLogical(
      wev.clientX,
      wev.clientY,
      canvas,
      logicalWidth,
      logicalHeight,
    );
    setState((prev) => zoomAtViewportPoint(prev, factor, fx, fy, minScale, maxScale));
  };

  const onPointerDownCapture: EventListener = (ev) => {
    const pev = ev as PointerEvent;
    if (!shouldStartPan(pev)) return;
    pev.preventDefault();
    pev.stopPropagation();
    panning = { pointerId: pev.pointerId, lastClientX: pev.clientX, lastClientY: pev.clientY };
    try {
      canvas.setPointerCapture(pev.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove: EventListener = (ev) => {
    const pev = ev as PointerEvent;
    if (!panning || pev.pointerId !== panning.pointerId) return;
    if (!modifiersDown(pev)) {
      clearPan();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const rw = rect.width || 1;
    const rh = rect.height || 1;
    const dx = ((pev.clientX - panning.lastClientX) * logicalWidth) / rw;
    const dy = ((pev.clientY - panning.lastClientY) * logicalHeight) / rh;
    panning = {
      pointerId: panning.pointerId,
      lastClientX: pev.clientX,
      lastClientY: pev.clientY,
    };
    setState((prev) => panViewport(prev, dx, dy));
  };

  const endPan: EventListener = (ev) => {
    const pev = ev as PointerEvent;
    if (!panning || pev.pointerId !== panning.pointerId) return;
    clearPan();
  };

  /** 修饰键在拖拽中途松开时，部分环境 pointermove 上修饰位更新不可靠，用 keyup 兜底 */
  const onKeyUp = (ev: KeyboardEvent): void => {
    if (!panning) return;
    if (ev.key === "Meta" || ev.key === "Control") {
      clearPan();
    }
  };

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onPointerDownCapture, true);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", endPan);
  document.addEventListener("pointercancel", endPan);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("pointerdown", onPointerDownCapture, true);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", endPan);
    document.removeEventListener("pointercancel", endPan);
    window.removeEventListener("keyup", onKeyUp);
    panning = null;
  };
}
