import type { SceneRuntime } from "@react-canvas/core-v2";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useCallback } from "react";
import { clientToStageLocal } from "./stage-pointer-utils.ts";

export type StagePointerSurfaceProps = {
  runtime: SceneRuntime;
  /** 为 false 时不渲染（便于外层改用 Skia canvas 自行绑定同一套坐标）。 */
  enabled?: boolean;
};

/**
 * 铺满 Stage 容器的透明层，`z-index` 应低于 {@link DebugDomLayer}；后者为 `pointer-events: none`，指针事件会落到本层。
 * 接入 Skia 时：设 `enabled={false}`，在 `<canvas>` 上用 {@link clientToStageLocal} + `runtime.dispatchPointerLike` 复用同一语义。
 */
export function StagePointerSurface(props: StagePointerSurfaceProps): ReactNode {
  const { runtime, enabled = true } = props;
  if (!enabled) {
    return null;
  }

  const dispatch = useCallback(
    (
      type: "pointerdown" | "pointerup" | "click",
      el: Element,
      clientX: number,
      clientY: number,
    ) => {
      const { x, y } = clientToStageLocal(el, clientX, clientY);
      runtime.dispatchPointerLike({ type, x, y });
    },
    [runtime],
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      dispatch("pointerdown", el, e.clientX, e.clientY);
      if (typeof el.setPointerCapture === "function") {
        el.setPointerCapture(e.pointerId);
      }
    },
    [dispatch],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      dispatch("pointerup", el, e.clientX, e.clientY);
      if (e.button === 0) {
        dispatch("click", el, e.clientX, e.clientY);
      }
      if (
        typeof el.hasPointerCapture === "function" &&
        el.hasPointerCapture(e.pointerId) &&
        typeof el.releasePointerCapture === "function"
      ) {
        el.releasePointerCapture(e.pointerId);
      }
    },
    [dispatch],
  );

  return (
    <div
      role="presentation"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    />
  );
}
