import {
  initCanvasRuntime,
  queueLayoutPaintFrame,
  resetLayoutPaintQueue,
  type CanvasKit,
  type CanvasRuntime,
  type Surface,
  type ViewNode,
} from "@react-canvas/core";

import { canvasBackingStoreSize } from "./backing-store.ts";

export type DemoHost = {
  runtime: CanvasRuntime;
  canvasKit: CanvasKit;
  surface: Surface;
  canvas: HTMLCanvasElement;
  logicalWidth: number;
  logicalHeight: number;
  dpr: number;
  requestFrame: (root: ViewNode) => void;
  dispose: () => void;
};

/**
 * 在容器内创建 `<canvas>`、初始化 Yoga+CanvasKit、创建 Skia Surface。
 * 每个 demo 自建 `ViewNode` 树，通过 `requestFrame(root)` 调度布局与绘制。
 */
export async function createDemoHost(
  container: HTMLElement,
  logicalWidth: number,
  logicalHeight: number,
): Promise<DemoHost> {
  const runtime = await initCanvasRuntime();
  const { canvasKit } = runtime;

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  container.appendChild(canvas);

  const dpr =
    typeof globalThis !== "undefined" && "devicePixelRatio" in globalThis
      ? ((globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1)
      : 1;

  const lw = Math.max(1, Math.round(logicalWidth));
  const lh = Math.max(1, Math.round(logicalHeight));
  const { bw, bh, rootScale } = canvasBackingStoreSize(lw, lh, dpr);
  canvas.width = bw;
  canvas.height = bh;
  canvas.style.width = `${lw}px`;
  canvas.style.height = `${lh}px`;

  const surface =
    typeof globalThis.WebGLRenderingContext === "function"
      ? (canvasKit.MakeWebGLCanvasSurface(canvas) ?? canvasKit.MakeSWCanvasSurface(canvas))
      : canvasKit.MakeSWCanvasSurface(canvas);
  if (!surface) {
    throw new Error("[core-test] Failed to create CanvasKit surface.");
  }

  const requestFrame = (root: ViewNode): void => {
    queueLayoutPaintFrame(surface, canvasKit, root, lw, lh, rootScale, null);
  };

  const dispose = (): void => {
    resetLayoutPaintQueue(surface);
    surface.delete();
    canvas.remove();
  };

  return {
    runtime,
    canvasKit,
    surface,
    canvas,
    logicalWidth: lw,
    logicalHeight: lh,
    dpr: rootScale,
    requestFrame,
    dispose,
  };
}
