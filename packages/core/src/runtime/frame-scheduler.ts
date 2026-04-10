import type { CanvasKit, Surface } from "canvaskit-wasm";
import type { ViewportCamera } from "../render/camera.ts";
import { paintScene, paintStageLayers } from "../render/paint.ts";
import type { ViewNode } from "../scene/view-node.ts";

export type FrameSchedulerHooks = {
  onPendingFrame?: (surface: Surface) => void;
  onFrameComplete?: (surface: Surface) => void;
};

/**
 * 单块 {@link Surface} 的布局/绘制 rAF 合并队列；每个 Stage 对应一块 Surface 与一个调度器实例。
 */
export class FrameScheduler {
  readonly surface: Surface;

  private pendingLayout = false;
  private pendingPaint = false;
  private hasPendingFrame = false;
  private pendingRafId: number | null = null;
  private frameRoots: ViewNode[] = [];
  private frameWidth = 0;
  private frameHeight = 0;
  private frameDpr = 1;
  private frameCanvasKit: CanvasKit | null = null;
  private frameCamera: ViewportCamera | null = null;

  private readonly hooks: FrameSchedulerHooks;

  constructor(surface: Surface, hooks: FrameSchedulerHooks = {}) {
    this.surface = surface;
    this.hooks = hooks;
  }

  queueLayoutPaintFrame(
    canvasKit: CanvasKit,
    rootNode: ViewNode,
    width: number,
    height: number,
    dpr: number,
    camera?: ViewportCamera | null,
  ): void {
    this.queueLayoutPaintFrames(canvasKit, [rootNode], width, height, dpr, camera);
  }

  /**
   * 多根节点（多 Layer）：按数组顺序布局；绘制时低 index 先画、后画者叠在上层。
   */
  queueLayoutPaintFrames(
    canvasKit: CanvasKit,
    rootNodes: ViewNode[],
    width: number,
    height: number,
    dpr: number,
    camera?: ViewportCamera | null,
  ): void {
    if (rootNodes.length === 0) return;
    this.frameRoots = rootNodes;
    this.frameWidth = width;
    this.frameHeight = height;
    this.frameDpr = dpr;
    this.frameCanvasKit = canvasKit;
    this.frameCamera = camera ?? null;
    this.pendingLayout = true;
    this.pendingPaint = true;
    this.scheduleFrame();
  }

  /**
   * 仅重绘（不跑 Yoga）；与 {@link queueLayoutPaintFrame} 共用同一 rAF 槽位。
   */
  queuePaintOnlyFrame(
    canvasKit: CanvasKit,
    rootNode: ViewNode,
    width: number,
    height: number,
    dpr: number,
    camera?: ViewportCamera | null,
  ): void {
    this.queuePaintOnlyFrames(canvasKit, [rootNode], width, height, dpr, camera);
  }

  queuePaintOnlyFrames(
    canvasKit: CanvasKit,
    rootNodes: ViewNode[],
    width: number,
    height: number,
    dpr: number,
    camera?: ViewportCamera | null,
  ): void {
    if (this.pendingLayout) return;
    if (rootNodes.length === 0) return;
    this.frameRoots = rootNodes;
    this.frameWidth = width;
    this.frameHeight = height;
    this.frameDpr = dpr;
    this.frameCanvasKit = canvasKit;
    this.frameCamera = camera ?? null;
    this.pendingPaint = true;
    this.scheduleFrame();
  }

  /**
   * 在 {@link Surface.delete} 之前调用，取消挂起的 rAF，避免在已释放的 canvas 上绘制。
   */
  reset(): void {
    const cancel = (globalThis as { cancelAnimationFrame?: (id: number) => void })
      .cancelAnimationFrame;
    if (this.pendingRafId !== null && typeof cancel === "function") {
      cancel(this.pendingRafId);
    }
    this.pendingRafId = null;
    this.hasPendingFrame = false;
    this.pendingLayout = false;
    this.pendingPaint = false;
    this.frameRoots = [];
  }

  private scheduleFrame(): void {
    if (this.hasPendingFrame) return;
    this.hasPendingFrame = true;
    this.hooks.onPendingFrame?.(this.surface);
    const surface = this.surface;
    const rafId = surface.requestAnimationFrame((skCanvas) => {
      const doLayout = this.pendingLayout;
      const doPaint = this.pendingPaint;
      const roots = this.frameRoots;
      const w = this.frameWidth;
      const h = this.frameHeight;
      const d = this.frameDpr;
      const ck = this.frameCanvasKit;
      const cam = this.frameCamera;
      this.pendingLayout = false;
      this.pendingPaint = false;
      if (roots.length > 0 && ck) {
        if (doLayout) {
          for (const r of roots) {
            r.calculateLayout(w, h, ck);
          }
        }
        if (doPaint) {
          const paint = new ck.Paint();
          paint.setAntiAlias(true);
          if (roots.length === 1) {
            paintScene(roots[0]!, skCanvas, ck, d, paint, cam);
          } else {
            paintStageLayers(roots, skCanvas, ck, d, paint, cam);
          }
          paint.delete();
        }
      }
      this.hasPendingFrame = false;
      this.pendingRafId = null;
      this.hooks.onFrameComplete?.(surface);
    });
    if (this.hasPendingFrame) {
      this.pendingRafId = typeof rafId === "number" ? rafId : null;
    }
  }
}
