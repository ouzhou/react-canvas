import type { CanvasKit, TypefaceFontProvider } from "canvaskit-wasm";

import { BUILTIN_PARAGRAPH_FONT_URL } from "../fonts/builtin.ts";
import { loadDefaultParagraphFont } from "../fonts/load-default-paragraph-font.ts";
import { setParagraphMeasureContext } from "../layout/paragraph-measure-context.ts";
import { loadYoga, type Yoga } from "../layout/yoga.ts";
import { initCanvasKit } from "../render/canvaskit.ts";

/** 与 `docs/core-design.md` §2.2 对齐：Yoga + CanvasKit 模块级单例。 */
export type Runtime = {
  yoga: Yoga;
  canvasKit: CanvasKit;
  /** 空字符串表示未加载默认段落字体（`loadDefaultParagraphFonts: false`）。 */
  defaultParagraphFontFamily: string;
  /** 持有注册字体，避免被 GC 回收。未加载时为 `null`。 */
  paragraphFontProvider: TypefaceFontProvider | null;
};

export type RuntimeOptions = {
  /**
   * 是否在 `initRuntime` 中拉取并注册默认段落字体。
   * 单测或离线环境可传 `false`；默认 `true`（与规格默认字体一致）。
   */
  loadDefaultParagraphFonts?: boolean;
  /** 覆盖 {@link BUILTIN_PARAGRAPH_FONT_URL}。 */
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
      .then(async ([yoga, canvasKit]) => {
        const opts = firstOptions;
        let paragraphFontProvider: TypefaceFontProvider | null = null;
        let defaultParagraphFontFamily = "";
        if (opts?.loadDefaultParagraphFonts !== false) {
          const url = opts?.defaultParagraphFontUrl ?? BUILTIN_PARAGRAPH_FONT_URL;
          const loaded = await loadDefaultParagraphFont(canvasKit, url);
          paragraphFontProvider = loaded.provider;
          defaultParagraphFontFamily = loaded.familyName;
        }
        const runtime: Runtime = {
          yoga,
          canvasKit,
          defaultParagraphFontFamily,
          paragraphFontProvider,
        };
        if (paragraphFontProvider && defaultParagraphFontFamily) {
          setParagraphMeasureContext({
            ck: canvasKit,
            fontFamily: defaultParagraphFontFamily,
            fontProvider: paragraphFontProvider,
          });
        } else {
          setParagraphMeasureContext(null);
        }
        setSnapshot({ status: "ready", runtime });
        return runtime;
      })
      .catch((e: unknown) => {
        setParagraphMeasureContext(null);
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
  setParagraphMeasureContext(null);
}
