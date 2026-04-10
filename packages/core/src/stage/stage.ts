import type { Surface } from "canvaskit-wasm";

import { canvasBackingStoreSize } from "../geometry/canvas-backing-store.ts";
import type { ViewportCamera } from "../render/camera.ts";
import { attachCanvasPointerHandlers } from "../input/canvas-pointer.ts";
import type { ViewNode } from "../scene/view-node.ts";
import { createAndBindFrameScheduler, resetLayoutPaintQueue } from "../runtime/frame-queue.ts";
import type { FrameScheduler } from "../runtime/frame-scheduler.ts";
import type { Runtime } from "../runtime/runtime.ts";
import { Layer } from "./layer.ts";
import { Ticker } from "./ticker.ts";

export type StageOptions = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  /** 默认与浏览器一致：`devicePixelRatio`，非浏览器环境为 `1`。 */
  dpr?: number;
};

function defaultDevicePixelRatio(): number {
  if (typeof globalThis !== "undefined" && "devicePixelRatio" in globalThis) {
    return (globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1;
  }
  return 1;
}

/**
 * 画布宿主：持有 DOM `<canvas>` 上的 CanvasKit {@link Surface}，与 `core-design.md` §3 对齐。
 */
export class Stage {
  readonly runtime: Runtime;
  /** zIndex=0，普通内容与 reconciler 默认挂载根。 */
  readonly defaultLayer: Layer;
  /** zIndex=100，tooltip / dropdown 等。 */
  readonly overlayLayer: Layer;
  /** zIndex=1000，modal / dialog；默认 `captureEvents=true`（事件语义见后续 Phase）。 */
  readonly modalLayer: Layer;
  private readonly canvas: HTMLCanvasElement;
  private surface: Surface | null = null;
  /** 与 {@link Surface} 一一对应；`teardownSurface` 时随 `resetLayoutPaintQueue` 解除注册。 */
  private frameScheduler: FrameScheduler | null = null;
  /** 由 {@link createTicker} 创建；{@link teardownSurface} 时全部 {@link Ticker.destroy}。 */
  private readonly tickers = new Set<Ticker>();
  /** `pointerId` → 捕获节点；见 `core-design.md` §8.6。 */
  private readonly pointerCaptureById = new Map<number, ViewNode>();
  private pointerDetach: (() => void) | null = null;
  private lw = 1;
  private lh = 1;
  /** 与历史 `frameRef.dpr` 一致：逻辑像素与 backing-store 的缩放（来自 `canvasBackingStoreSize` 的 `rootScale`）。 */
  private rootScale = 1;

  constructor(runtime: Runtime, options: StageOptions) {
    this.runtime = runtime;
    this.canvas = options.canvas;
    this.mountSurface(options.width, options.height, options.dpr ?? defaultDevicePixelRatio());
    this.defaultLayer = new Layer(this, { zIndex: 0, captureEvents: false, visible: true });
    this.overlayLayer = new Layer(this, { zIndex: 100, captureEvents: false, visible: true });
    this.modalLayer = new Layer(this, { zIndex: 1000, captureEvents: true, visible: true });
  }

  /** 按 `zIndex` 排序的内置层（绘制与布局顺序）。 */
  layersInPaintOrder(): Layer[] {
    return [this.defaultLayer, this.overlayLayer, this.modalLayer].sort(
      (a, b) => a.zIndex - b.zIndex,
    );
  }

  get width(): number {
    return this.lw;
  }

  get height(): number {
    return this.lh;
  }

  /** 逻辑坐标 → backing-store 像素的比例（等价于原 reconciler 里 `dpr` 字段）。 */
  get dpr(): number {
    return this.rootScale;
  }

  getSurface(): Surface | null {
    return this.surface;
  }

  /**
   * 当前画布对应的帧调度器；无 Surface 时为 `null`。
   * 与 `queueLayoutPaintFrame(surface, …)` 使用同一 `FrameScheduler` 实例（见 `createAndBindFrameScheduler`）。
   */
  getFrameScheduler(): FrameScheduler | null {
    return this.frameScheduler;
  }

  /**
   * 创建与当前 Stage 绑定的 {@link Ticker}（`core-design.md` §9）。
   * `Stage.destroy` / `resize` 换 Surface 前会自动销毁全部 Ticker。
   */
  createTicker(): Ticker {
    const t = new Ticker(this);
    this.tickers.add(t);
    return t;
  }

  /**
   * 由 {@link Ticker.destroy} 调用，从宿主移除引用。
   * @internal
   */
  detachTicker(t: Ticker): void {
    this.tickers.delete(t);
  }

  /**
   * 将 `pointerId` 的后续 `pointermove` / `pointerup` 路由到 `node`（跳过命中测试），与 DOM `setPointerCapture` 语义一致。
   */
  setPointerCapture(node: ViewNode, pointerId: number): void {
    this.pointerCaptureById.set(pointerId, node);
  }

  /**
   * 仅当当前捕获节点为 `node` 时释放；否则忽略。
   */
  releasePointerCapture(node: ViewNode, pointerId: number): void {
    if (this.pointerCaptureById.get(pointerId) !== node) return;
    this.pointerCaptureById.delete(pointerId);
  }

  /** @internal 供 {@link attachCanvasPointerHandlers} 查询当前捕获目标。 */
  getPointerCaptureTarget(pointerId: number): ViewNode | undefined {
    return this.pointerCaptureById.get(pointerId);
  }

  /** @internal 在 `pointerup` / `pointercancel` 末尾清除捕获。 */
  clearPointerCaptureForPointerId(pointerId: number): void {
    this.pointerCaptureById.delete(pointerId);
  }

  resize(width: number, height: number, dpr?: number): void {
    this.teardownSurface();
    this.mountSurface(width, height, dpr ?? defaultDevicePixelRatio());
  }

  destroy(): void {
    this.detachPointerHandlers();
    this.pointerCaptureById.clear();
    this.clearAllLayerChildren();
    this.teardownSurface();
  }

  /**
   * 绑定指针/滚轮到当前 `<canvas>`（与 `react` 包原 `attachCanvasPointerHandlers` 行为一致）。
   * 再次调用会先解除上一批监听。{@link destroy} 时也会自动解除。
   *
   * @param sceneRoot 省略时使用 {@link defaultLayer.root}。多 Layer 命中测试后续在 EventDispatcher 中扩展。
   */
  attachPointerHandlers(sceneRoot?: ViewNode, getCamera?: () => ViewportCamera | null): () => void {
    this.detachPointerHandlers();
    const root = sceneRoot ?? this.defaultLayer.root;
    const detach = attachCanvasPointerHandlers(
      this.canvas,
      root,
      this.width,
      this.height,
      this.runtime.canvasKit,
      () => {
        this.requestLayoutPaint();
      },
      getCamera,
      {
        getTarget: (pointerId) => this.getPointerCaptureTarget(pointerId),
        release: (pointerId) => this.clearPointerCaptureForPointerId(pointerId),
      },
    );
    this.pointerDetach = detach;
    return () => {
      detach();
      if (this.pointerDetach === detach) {
        this.pointerDetach = null;
      }
    };
  }

  /** 解除 {@link attachPointerHandlers} 注册的监听（幂等）。 */
  detachPointerHandlers(): void {
    this.pointerDetach?.();
    this.pointerDetach = null;
  }

  /**
   * 请求下一帧做 Yoga 布局并绘制场景（与 reconciler 中 `queueLayoutPaintFrame` 一致）。
   * 省略 `root` 时按 {@link layersInPaintOrder} 绘制全部可见层。
   */
  requestLayoutPaint(root?: ViewNode, camera?: ViewportCamera | null): void {
    const fs = this.frameScheduler;
    if (!fs) {
      throw new Error("[@react-canvas/core] Stage has no surface; cannot requestLayoutPaint.");
    }
    const ck = this.runtime.canvasKit;
    const w = this.width;
    const h = this.height;
    const d = this.dpr;
    if (root !== undefined) {
      fs.queueLayoutPaintFrame(ck, root, w, h, d, camera);
    } else {
      fs.queueLayoutPaintFrames(ck, this.getVisibleLayerRoots(), w, h, d, camera);
    }
  }

  /**
   * 仅重绘（不跑布局）；例如滚动偏移等仅影响绘制的更新。
   * 省略 `root` 时按层顺序重绘全部可见层。
   */
  requestPaintOnly(root?: ViewNode, camera?: ViewportCamera | null): void {
    const fs = this.frameScheduler;
    if (!fs) {
      throw new Error("[@react-canvas/core] Stage has no surface; cannot requestPaintOnly.");
    }
    const ck = this.runtime.canvasKit;
    const w = this.width;
    const h = this.height;
    const d = this.dpr;
    if (root !== undefined) {
      fs.queuePaintOnlyFrame(ck, root, w, h, d, camera);
    } else {
      fs.queuePaintOnlyFrames(ck, this.getVisibleLayerRoots(), w, h, d, camera);
    }
  }

  private getVisibleLayerRoots(): ViewNode[] {
    return this.layersInPaintOrder()
      .filter((l) => l.visible)
      .map((l) => l.root);
  }

  private clearAllLayerChildren(): void {
    for (const layer of this.layersInPaintOrder()) {
      const r = layer.root;
      const copy = [...r.children];
      for (const c of copy) {
        r.removeChild(c);
        c.destroy();
      }
    }
  }

  private mountSurface(width: number, height: number, dpr: number): void {
    const lw = Math.max(1, Math.round(width));
    const lh = Math.max(1, Math.round(height));
    const { bw, bh, rootScale } = canvasBackingStoreSize(lw, lh, dpr);
    this.lw = lw;
    this.lh = lh;
    this.rootScale = rootScale;

    const canvas = this.canvas;
    canvas.width = bw;
    canvas.height = bh;
    canvas.style.width = `${lw}px`;
    canvas.style.height = `${lh}px`;

    const ck = this.runtime.canvasKit;
    const surface =
      typeof globalThis.WebGLRenderingContext === "function"
        ? (ck.MakeWebGLCanvasSurface(canvas) ?? ck.MakeSWCanvasSurface(canvas))
        : ck.MakeSWCanvasSurface(canvas);
    if (!surface) {
      throw new Error("[@react-canvas/core] Failed to create a CanvasKit surface for <canvas>.");
    }
    this.surface = surface;
    this.frameScheduler = createAndBindFrameScheduler(surface);
  }

  private teardownSurface(): void {
    for (const t of Array.from(this.tickers)) {
      t.destroy();
    }
    if (this.surface) {
      resetLayoutPaintQueue(this.surface);
      this.frameScheduler = null;
      this.surface.delete();
      this.surface = null;
    }
  }
}
