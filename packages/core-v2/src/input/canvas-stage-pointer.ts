import type { SceneRuntime } from "../runtime/scene-runtime.ts";
import { clientXYToStageLocal } from "./stage-client-coords.ts";

/**
 * 在 `<canvas>` 上转发指针为 `dispatchPointerLike`（Stage 坐标与布局一致）。
 */
export function attachCanvasStagePointer(
  canvas: HTMLCanvasElement,
  runtime: SceneRuntime,
): () => void {
  const dispatch = (
    type: "pointerdown" | "pointerup" | "click",
    el: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ): void => {
    const r = el.getBoundingClientRect();
    const { x, y } = clientXYToStageLocal({ left: r.left, top: r.top }, clientX, clientY);
    runtime.dispatchPointerLike({ type, x, y });
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

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";

  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointerup", onPointerUp);
  };
}
