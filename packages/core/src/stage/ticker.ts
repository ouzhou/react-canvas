import type { Stage } from "./stage.ts";

export type TickerFrameFn = (deltaMs: number, now: number) => boolean | void;

/**
 * 每帧回调驱动器，与 {@link Stage} 同生命周期；见 `core-design.md` §9。
 * 回调内应调用 `stage.requestPaintOnly()` / `requestLayoutPaint()` 触发重绘。
 */
export class Ticker {
  private readonly fns = new Set<TickerFrameFn>();
  private active = false;
  private rafId: number | null = null;
  private lastNow = 0;
  private destroyed = false;

  constructor(private readonly stage: Stage) {}

  /**
   * 添加每帧回调。返回 `true` 时该回调会从集合中移除。
   * 返回函数用于取消订阅。
   */
  add(fn: TickerFrameFn): () => void {
    this.fns.add(fn);
    return () => this.fns.delete(fn);
  }

  remove(fn: TickerFrameFn): void {
    this.fns.delete(fn);
  }

  start(): void {
    if (this.destroyed || this.active) return;
    this.active = true;
    this.lastNow = typeof globalThis.performance !== "undefined" ? globalThis.performance.now() : 0;
    this.scheduleFrame();
  }

  stop(): void {
    this.active = false;
    this.cancelPendingFrame();
  }

  get running(): boolean {
    return this.active;
  }

  /** 停止、清空回调并从 {@link Stage} 注销（由 Stage 在销毁/换 Surface 时也会调用）。 */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    this.fns.clear();
    this.stage.detachTicker(this);
  }

  private cancelPendingFrame(): void {
    if (this.rafId === null) return;
    const cancel = (globalThis as { cancelAnimationFrame?: (id: number) => void })
      .cancelAnimationFrame;
    if (typeof cancel === "function") {
      cancel(this.rafId);
    }
    this.rafId = null;
  }

  private scheduleFrame(): void {
    if (!this.active || this.destroyed) return;
    const surface = this.stage.getSurface();
    if (!surface) {
      this.active = false;
      return;
    }
    const rafId = surface.requestAnimationFrame(() => {
      this.rafId = null;
      if (!this.active || this.destroyed) return;
      const now = typeof globalThis.performance !== "undefined" ? globalThis.performance.now() : 0;
      const deltaMs = this.lastNow > 0 ? now - this.lastNow : 0;
      this.lastNow = now;

      for (const fn of Array.from(this.fns)) {
        try {
          if (fn(deltaMs, now) === true) {
            this.fns.delete(fn);
          }
        } catch {
          this.fns.delete(fn);
        }
      }

      if (!this.active || this.destroyed) return;
      if (this.fns.size === 0) {
        this.active = false;
        return;
      }
      this.scheduleFrame();
    });
    this.rafId = typeof rafId === "number" ? rafId : null;
  }
}
