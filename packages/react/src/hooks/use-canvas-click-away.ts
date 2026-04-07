import { hitTest, type ViewNode } from "@react-canvas/core";
import { useEffect, useRef, type RefObject } from "react";
import { getCanvasFrame } from "../canvas/canvas-frame-registry.ts";
import { clientToCanvasLogical } from "../input/canvas-pointer.ts";

function isDescendantOf(leaf: ViewNode | null, ancestor: ViewNode): boolean {
  let n: ViewNode | null = leaf;
  while (n) {
    if (n === ancestor) return true;
    n = n.parent as ViewNode | null;
  }
  return false;
}

export type UseCanvasClickAwayOptions = {
  enabled?: boolean;
  /**
   * 浮层根节点对应的 scene `ViewNode`（如 Select 根 `View` 上通过 `viewNodeRef` 绑定）。
   * 点在画布上且命中落在该子树内时不触发 `onAway`。
   */
  boundaryRef: RefObject<ViewNode | null>;
};

/**
 * 在 `document` 上监听 `pointerdown`（capture）。
 * - 点在**非 canvas** 的 DOM 上：视为外部，触发 `onAway`。
 * - 点在 **canvas** 上：用当前帧的 `hitTest` 判断；若最深命中节点在 `boundaryRef` 子树内则不触发，否则触发。
 *
 * 依赖 `<Canvas>` 在挂载时向 {@link registerCanvasFrame} 注册当前画布帧（见 `canvas.tsx`）。
 */
export function useCanvasClickAway(onAway: () => void, options: UseCanvasClickAwayOptions): void {
  const { enabled = true, boundaryRef } = options;
  const onAwayRef = useRef(onAway);
  onAwayRef.current = onAway;

  useEffect(() => {
    if (!enabled) return;

    const onPointerDownCapture = (event: Event): void => {
      const e = event as PointerEvent;
      const t = e.target;
      if (!(t instanceof Node)) return;

      const canvasEl =
        t instanceof HTMLCanvasElement ? t : t instanceof Element ? t.closest("canvas") : null;
      if (canvasEl instanceof HTMLCanvasElement) {
        const frame = getCanvasFrame(canvasEl);
        const boundary = boundaryRef.current;
        if (!frame || !boundary) return;

        const { x, y } = clientToCanvasLogical(
          e.clientX,
          e.clientY,
          canvasEl,
          frame.logicalWidth,
          frame.logicalHeight,
        );
        const leaf = hitTest(frame.sceneRoot, x, y, frame.canvasKit, frame.camera);
        if (leaf && isDescendantOf(leaf, boundary)) return;
        onAwayRef.current();
        return;
      }

      onAwayRef.current();
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
    };
  }, [enabled, boundaryRef]);
}
