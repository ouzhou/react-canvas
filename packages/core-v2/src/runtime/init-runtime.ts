import type { CanvasKit } from "canvaskit-wasm";

import { loadYoga, type Yoga } from "../layout/yoga.ts";
import { initCanvasKit } from "../render/canvaskit.ts";

/** 与 `docs/core-design.md` §2.2 对齐：Yoga + CanvasKit 模块级单例。 */
export type Runtime = {
  yoga: Yoga;
  canvasKit: CanvasKit;
};

/** 预留与 `initRuntime` 对齐；字体等接入后再透传。 */
export type RuntimeOptions = {
  loadDefaultParagraphFonts?: boolean;
  defaultParagraphFontUrl?: string;
};

export type RuntimeInitSnapshot =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; runtime: Runtime }
  | { status: "error"; error: Error };

let firstOptions: RuntimeOptions | undefined;
let runtimePromise: Promise<Runtime> | null = null;

let snapshot: RuntimeInitSnapshot = { status: "idle" };
const listeners = new Set<() => void>();

function emit(): void {
  for (const cb of listeners) cb();
}

function setSnapshot(next: RuntimeInitSnapshot): void {
  snapshot = next;
  emit();
}

export function getRuntimeSnapshot(): RuntimeInitSnapshot {
  return snapshot;
}

/** SSR：无 WASM，保持与客户端首帧可水合的保守快照。 */
export function getRuntimeServerSnapshot(): RuntimeInitSnapshot {
  return { status: "idle" };
}

export function subscribeRuntimeInit(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * 初始化 Yoga + CanvasKit。模块级单例：多次调用返回同一 Promise；
 * 首次传入的 `options` 保留（与文档「第一次生效」一致，当前仅占位）。
 */
export function initRuntime(options?: RuntimeOptions): Promise<Runtime> {
  if (firstOptions === undefined && options !== undefined) {
    firstOptions = options;
  }
  if (!runtimePromise) {
    setSnapshot({ status: "loading" });
    runtimePromise = Promise.all([loadYoga(), initCanvasKit()])
      .then(([yoga, canvasKit]) => {
        const runtime: Runtime = { yoga, canvasKit };
        setSnapshot({ status: "ready", runtime });
        return runtime;
      })
      .catch((e: unknown) => {
        const error = e instanceof Error ? e : new Error(String(e));
        setSnapshot({ status: "error", error });
        return Promise.reject(error);
      });
  }
  return runtimePromise;
}

/**
 * 仅用于测试：重置模块级 `initRuntime` 状态（快照、Promise、订阅者）。
 * 调用方需已卸载依赖该快照的 UI（如 `CanvasProvider`）。
 */
export function resetRuntimeInitForTests(): void {
  listeners.clear();
  firstOptions = undefined;
  runtimePromise = null;
  snapshot = { status: "idle" };
}
