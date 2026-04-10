import type { Surface } from "canvaskit-wasm";

import { canvasBackingStoreSize } from "../geometry/canvas-backing-store.ts";
import type { Runtime } from "../runtime/runtime.ts";

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
  private readonly canvas: HTMLCanvasElement;
  private surface: Surface | null = null;
  private lw = 1;
  private lh = 1;
  /** 与历史 `frameRef.dpr` 一致：逻辑像素与 backing-store 的缩放（来自 `canvasBackingStoreSize` 的 `rootScale`）。 */
  private rootScale = 1;

  constructor(runtime: Runtime, options: StageOptions) {
    this.runtime = runtime;
    this.canvas = options.canvas;
    this.mountSurface(options.width, options.height, options.dpr ?? defaultDevicePixelRatio());
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

  resize(width: number, height: number, dpr?: number): void {
    this.teardownSurface();
    this.mountSurface(width, height, dpr ?? defaultDevicePixelRatio());
  }

  destroy(): void {
    this.teardownSurface();
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
  }

  private teardownSurface(): void {
    if (this.surface) {
      this.surface.delete();
      this.surface = null;
    }
  }
}
