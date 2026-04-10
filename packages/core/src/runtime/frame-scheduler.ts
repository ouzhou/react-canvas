import type { CanvasKit, Surface } from "canvaskit-wasm";
import type { ViewportCamera } from "../render/camera.ts";
import { paintScene } from "../render/paint.ts";
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
  private frameRoot: ViewNode | null = null;
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
    this.frameRoot = rootNode;
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
    if (this.pendingLayout) return;
    this.frameRoot = rootNode;
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
  }

  private scheduleFrame(): void {
    if (this.hasPendingFrame) return;
    this.hasPendingFrame = true;
    this.hooks.onPendingFrame?.(this.surface);
    const surface = this.surface;
    const rafId = surface.requestAnimationFrame((skCanvas) => {
      const doLayout = this.pendingLayout;
      const doPaint = this.pendingPaint;
      const root = this.frameRoot;
      const w = this.frameWidth;
      const h = this.frameHeight;
      const d = this.frameDpr;
      const ck = this.frameCanvasKit;
      const cam = this.frameCamera;
      this.pendingLayout = false;
      this.pendingPaint = false;
      if (root && ck) {
        if (doLayout) root.calculateLayout(w, h, ck);
        if (doPaint) {
          const paint = new ck.Paint();
          paint.setAntiAlias(true);
          paintScene(root, skCanvas, ck, d, paint, cam);
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
