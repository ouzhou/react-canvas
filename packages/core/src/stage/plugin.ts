import type { BeforePaintEvent } from "../runtime/frame-scheduler.ts";
import type { CursorManager } from "../input/cursor-manager.ts";
import type { Runtime } from "../runtime/runtime.ts";
import type { Stage } from "./stage.ts";

/**
 * 可订阅钩子；与 `core-design.md` §18.3 `HookSlot` 一致。
 */
export class HookSlot<E> {
  private readonly fns = new Set<(e: E) => void>();

  tap(fn: (e: E) => void): () => void {
    this.fns.add(fn);
    return () => {
      this.fns.delete(fn);
    };
  }

  /** @internal 供 {@link Stage} 在帧调度中触发 */
  emit(e: E): void {
    for (const fn of this.fns) fn(e);
  }
}

export type PluginContext = {
  readonly stage: Stage;
  readonly runtime: Runtime;
  readonly canvas: HTMLCanvasElement;
  readonly cursorManager: CursorManager;
  readonly onBeforePaint: { tap(fn: (e: BeforePaintEvent) => void): () => void };
  readonly onAfterPaint: { tap(fn: (e: BeforePaintEvent) => void): () => void };
  provide<T>(key: symbol, value: T): void;
  consume<T>(key: symbol): T | undefined;
  addDOMListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (e: HTMLElementEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): () => void;
};

export type Plugin = {
  readonly name: string;
  attach(ctx: PluginContext): void;
  detach(): void;
  readonly after?: readonly string[];
};

export function createPluginContext(
  stage: Stage,
  opts: {
    runtime: Runtime;
    canvas: HTMLCanvasElement;
    cursorManager: CursorManager;
    beforePaint: HookSlot<BeforePaintEvent>;
    afterPaint: HookSlot<BeforePaintEvent>;
    services: Map<symbol, unknown>;
  },
): PluginContext {
  return {
    stage,
    runtime: opts.runtime,
    canvas: opts.canvas,
    cursorManager: opts.cursorManager,
    onBeforePaint: { tap: (fn) => opts.beforePaint.tap(fn) },
    onAfterPaint: { tap: (fn) => opts.afterPaint.tap(fn) },
    provide(key, value) {
      opts.services.set(key, value);
    },
    consume<T>(key: symbol): T | undefined {
      return opts.services.get(key) as T | undefined;
    },
    addDOMListener(type, listener, options) {
      opts.canvas.addEventListener(type, listener as EventListener, options);
      return () => {
        opts.canvas.removeEventListener(type, listener as EventListener, options);
      };
    },
  };
}
