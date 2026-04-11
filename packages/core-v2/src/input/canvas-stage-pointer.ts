import type { SceneRuntime } from "../runtime/scene-runtime.ts";
import { clientXYToStageLocal } from "./stage-client-coords.ts";

/**
 * 在 `<canvas>` 上转发指针为 `dispatchPointerLike`（Stage 坐标与布局一致）。
 * `pointermove` 经 `requestAnimationFrame` 合并为每帧至多一次；`pointerleave`（画布）时调用 `notifyPointerLeftStage` 清除 hover。
 */
export function attachCanvasStagePointer(
  canvas: HTMLCanvasElement,
  runtime: SceneRuntime,
): () => void {
  let lastStageX = 0;
  let lastStageY = 0;

  const toStage = (el: HTMLCanvasElement, clientX: number, clientY: number) => {
    const r = el.getBoundingClientRect();
    return clientXYToStageLocal({ left: r.left, top: r.top }, clientX, clientY);
  };

  const dispatch = (
    type: "pointerdown" | "pointerup" | "click",
    el: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ): void => {
    const { x, y } = toStage(el, clientX, clientY);
    lastStageX = x;
    lastStageY = y;
    runtime.dispatchPointerLike({ type, x, y });
  };

  let rafId: number | null = null;
  let pending: { x: number; y: number } | null = null;

  const flushMove = (): void => {
    rafId = null;
    if (pending === null) return;
    const { x, y } = pending;
    pending = null;
    lastStageX = x;
    lastStageY = y;
    runtime.dispatchPointerLike({ type: "pointermove", x, y });
  };

  const schedulePointerMove = (x: number, y: number): void => {
    pending = { x, y };
    if (rafId !== null) return;
    rafId = requestAnimationFrame(flushMove);
  };

  const onPointerDown = (e: PointerEvent): void => {
    dispatch("pointerdown", canvas, e.clientX, e.clientY);
    if (typeof canvas.setPointerCapture === "function") {
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    dispatch("pointerup", canvas, e.clientX, e.clientY);
    if (e.button === 0) {
      dispatch("click", canvas, e.clientX, e.clientY);
    }
    if (
      typeof canvas.hasPointerCapture === "function" &&
      canvas.hasPointerCapture(e.pointerId) &&
      typeof canvas.releasePointerCapture === "function"
    ) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: PointerEvent): void => {
    const { x, y } = toStage(canvas, e.clientX, e.clientY);
    lastStageX = x;
    lastStageY = y;
    schedulePointerMove(x, y);
  };

  const onPointerLeave = (): void => {
    runtime.notifyPointerLeftStage(lastStageX, lastStageY);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pending = null;
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
  };
}
