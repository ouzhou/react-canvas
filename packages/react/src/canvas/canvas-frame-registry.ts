import type { CanvasKit, ViewportCamera, ViewNode } from "@react-canvas/core";

/** 与 DOM `<canvas>` 元素关联的当前场景快照，供 `useCanvasClickAway` 等做命中判断。 */
export type CanvasFrameSnapshot = {
  sceneRoot: ViewNode;
  canvasKit: CanvasKit;
  logicalWidth: number;
  logicalHeight: number;
  camera: ViewportCamera | null;
};

const canvasFrameByElement = new WeakMap<HTMLCanvasElement, CanvasFrameSnapshot>();

export function registerCanvasFrame(canvas: HTMLCanvasElement, snap: CanvasFrameSnapshot): void {
  canvasFrameByElement.set(canvas, snap);
}

export function unregisterCanvasFrame(canvas: HTMLCanvasElement): void {
  canvasFrameByElement.delete(canvas);
}

export function getCanvasFrame(canvas: HTMLCanvasElement): CanvasFrameSnapshot | undefined {
  return canvasFrameByElement.get(canvas);
}
