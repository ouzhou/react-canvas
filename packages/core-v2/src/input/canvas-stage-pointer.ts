import { bindSceneRuntimeCursorTarget, type SceneRuntime } from "../runtime/scene-runtime.ts";
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

  /** stage px → world px（相机逆变换）。 */
  const toWorld = (stageX: number, stageY: number) => {
    return runtime.screenToWorld(stageX, stageY);
  };

  const dispatch = (
    type: "pointerdown" | "pointerup" | "click",
    el: HTMLCanvasElement,
    clientX: number,
    clientY: number,
    buttons?: number,
  ): void => {
    const stage = toStage(el, clientX, clientY);
    const { x, y } = toWorld(stage.x, stage.y);
    lastStageX = stage.x;
    lastStageY = stage.y;
    runtime.dispatchPointerLike({ type, x, y, buttons });
  };

  let rafId: number | null = null;
  let pending: { stageX: number; stageY: number; buttons: number } | null = null;

  const flushMove = (): void => {
    rafId = null;
    if (pending === null) return;
    const { stageX, stageY, buttons } = pending;
    pending = null;
    lastStageX = stageX;
    lastStageY = stageY;
    const { x, y } = toWorld(stageX, stageY);
    runtime.dispatchPointerLike({ type: "pointermove", x, y, buttons });
  };

  const schedulePointerMove = (stageX: number, stageY: number, buttons: number): void => {
    pending = { stageX, stageY, buttons };
    if (rafId !== null) return;
    rafId = requestAnimationFrame(flushMove);
  };

  const onPointerDown = (e: PointerEvent): void => {
    dispatch("pointerdown", canvas, e.clientX, e.clientY, e.buttons);
    if (typeof canvas.setPointerCapture === "function") {
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const onPointerUp = (e: PointerEvent): void => {
    dispatch("pointerup", canvas, e.clientX, e.clientY, e.buttons);
    if (e.button === 0) {
      dispatch("click", canvas, e.clientX, e.clientY, e.buttons);
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
    const { x: stageX, y: stageY } = toStage(canvas, e.clientX, e.clientY);
    lastStageX = stageX;
    lastStageY = stageY;
    schedulePointerMove(stageX, stageY, e.buttons);
  };

  const onPointerLeave = (): void => {
    runtime.notifyPointerLeftStage(lastStageX, lastStageY);
  };

  const onWheel = (e: WheelEvent): void => {
    const stage = toStage(canvas, e.clientX, e.clientY);
    const { x, y } = toWorld(stage.x, stage.y);
    runtime.dispatchWheel({ x, y, deltaY: e.deltaY });
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointermove", onPointerMove, { passive: true });
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("wheel", onWheel, { passive: true });
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";

  bindSceneRuntimeCursorTarget(runtime, canvas);

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
    canvas.removeEventListener("wheel", onWheel);
    bindSceneRuntimeCursorTarget(runtime, null);
  };
}
