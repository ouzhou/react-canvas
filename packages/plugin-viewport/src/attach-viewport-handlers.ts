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
  /**
   * 滚轮缩放灵敏度，用于 `Math.exp(-deltaY * wheelZoomSensitivity)`。
   * 适当调大可使触控板捏合、鼠标滚轮缩放更快（默认约比早期 0.001 高约 4 倍）。
   */
  wheelZoomSensitivity?: number;
  /**
   * 为 true 时：左键拖拽即可平移（手型工具），无需按住 Cmd/Ctrl。
   * 仍保留「按住修饰键 + 左键」平移；滚轮缩放仍仅在修饰键按下时生效。
   * 为 true 时还会在 canvas 上切换 `grab` / `grabbing` 光标（进入拖拽 / 结束拖拽）。
   */
  primaryButtonPan?: boolean;
  /**
   * 为 true 时：未按住 Cmd/Ctrl 的滚轮事件（含触控板双指上下左右滑动）转为视口平移，而非交给画布内 ScrollView。
   * 在 **capture** 阶段处理并 `stopImmediatePropagation`，需先于画布默认指针逻辑注册（同一次 `attach` 内先于滚轮缩放分支即可）。
   */
  wheelPan?: boolean;
};

/** Cmd（macOS）/ Ctrl（Windows）按住时允许左键拖拽平移 */
function modifiersDown(ev: PointerEvent | WheelEvent): boolean {
  return ev.metaKey || ev.ctrlKey;
}

function normalizeWheelDeltaPixels(wev: WheelEvent): { dx: number; dy: number } {
  let dx = wev.deltaX;
  let dy = wev.deltaY;
  if (wev.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    const line = 16;
    dx *= line;
    dy *= line;
  } else if (wev.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    dx *= 480;
    dy *= 480;
  }
  return { dx, dy };
}

type PanningState = {
  pointerId: number;
  lastClientX: number;
  lastClientY: number;
  /** 为 true 时：拖拽过程中松开 Cmd/Ctrl 会结束平移（修饰键发起的平移）。 */
  endWhenModifierReleased: boolean;
};

/**
 * 在 `canvas` 上注册视口滚轮缩放与指针平移（默认 **Cmd/Ctrl + 左键**；可选 **仅左键**）。
 * 与 `attachCanvasPointerHandlers` 并存时：滚轮仅在 **Cmd/Ctrl 按下** 时由本函数处理（`@react-canvas/react` 已对修饰键滚轮在 ScrollView 分支早退）。
 */
export function attachViewportHandlers(
  canvas: HTMLCanvasElement,
  options: AttachViewportHandlersOptions,
): () => void {
  const {
    logicalWidth,
    logicalHeight,
    setState,
    minScale = 0.1,
    maxScale = 8,
    primaryButtonPan = false,
    wheelPan = false,
    wheelZoomSensitivity = 0.004,
  } = options;

  let panning: PanningState | null = null;

  const setHandToolCursor = (cursor: "grab" | "grabbing"): void => {
    if (!primaryButtonPan) return;
    canvas.style.cursor = cursor;
  };

  const clearPan = (): void => {
    if (!panning) return;
    const pid = panning.pointerId;
    panning = null;
    try {
      canvas.releasePointerCapture(pid);
    } catch {
      /* ignore */
    }
    setHandToolCursor("grab");
  };

  const onWheel: EventListener = (ev) => {
    const wev = ev as WheelEvent;

    /** Cmd/Ctrl + 滚轮：缩放（捏合也会带 ctrlKey，走此分支） */
    if (modifiersDown(wev)) {
      wev.preventDefault();
      let dy = wev.deltaY;
      /** Chrome/Safari 等：触控板双指捏合常以 `ctrlKey` + wheel 上报，单帧 delta 偏小 */
      if (wev.ctrlKey) {
        dy *= 2.1;
      }
      const factor = Math.exp(-dy * wheelZoomSensitivity);
      const { x: fx, y: fy } = clientToCanvasLogical(
        wev.clientX,
        wev.clientY,
        canvas,
        logicalWidth,
        logicalHeight,
      );
      setState((prev) => zoomAtViewportPoint(prev, factor, fx, fy, minScale, maxScale));
      return;
    }

    /** 无修饰键：可选将触控板双指滑动 / 滚轮转为视口平移 */
    if (wheelPan) {
      const { dx, dy } = normalizeWheelDeltaPixels(wev);
      if (dx === 0 && dy === 0) return;
      wev.preventDefault();
      wev.stopImmediatePropagation();
      const rect = canvas.getBoundingClientRect();
      const rw = rect.width || 1;
      const rh = rect.height || 1;
      /** 与系统「拖动纸张」直觉一致：双指上移则内容上移，故对 delta 取反 */
      const panX = (-dx * logicalWidth) / rw;
      const panY = (-dy * logicalHeight) / rh;
      setState((prev) => panViewport(prev, panX, panY));
    }
  };

  const onPointerDownCapture: EventListener = (ev) => {
    const pev = ev as PointerEvent;
    if (pev.button !== 0) return;

    let endWhenModifierReleased: boolean;
    if (modifiersDown(pev)) {
      endWhenModifierReleased = true;
    } else if (primaryButtonPan) {
      endWhenModifierReleased = false;
    } else {
      return;
    }

    pev.preventDefault();
    pev.stopPropagation();
    panning = {
      pointerId: pev.pointerId,
      lastClientX: pev.clientX,
      lastClientY: pev.clientY,
      endWhenModifierReleased,
    };
    try {
      canvas.setPointerCapture(pev.pointerId);
    } catch {
      /* ignore */
    }
    setHandToolCursor("grabbing");
  };

  const onPointerMove: EventListener = (ev) => {
    const pev = ev as PointerEvent;
    if (!panning || pev.pointerId !== panning.pointerId) return;
    if (panning.endWhenModifierReleased && !modifiersDown(pev)) {
      clearPan();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const rw = rect.width || 1;
    const rh = rect.height || 1;
    const dx = ((pev.clientX - panning.lastClientX) * logicalWidth) / rw;
    const dy = ((pev.clientY - panning.lastClientY) * logicalHeight) / rh;
    const endWhenModifierReleased = panning.endWhenModifierReleased;
    panning = {
      pointerId: panning.pointerId,
      lastClientX: pev.clientX,
      lastClientY: pev.clientY,
      endWhenModifierReleased,
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
    if (!panning?.endWhenModifierReleased) return;
    if (ev.key === "Meta" || ev.key === "Control") {
      clearPan();
    }
  };

  canvas.addEventListener("wheel", onWheel, { capture: true, passive: false });
  canvas.addEventListener("pointerdown", onPointerDownCapture, true);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", endPan);
  document.addEventListener("pointercancel", endPan);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    canvas.removeEventListener("wheel", onWheel, { capture: true });
    canvas.removeEventListener("pointerdown", onPointerDownCapture, true);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", endPan);
    document.removeEventListener("pointercancel", endPan);
    window.removeEventListener("keyup", onKeyUp);
    if (panning) {
      const pid = panning.pointerId;
      panning = null;
      try {
        canvas.releasePointerCapture(pid);
      } catch {
        /* ignore */
      }
    }
    if (primaryButtonPan) {
      canvas.style.cursor = "grab";
    }
  };
}
