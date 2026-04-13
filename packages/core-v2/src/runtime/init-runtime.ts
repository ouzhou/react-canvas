import type { CanvasKit, TypefaceFontProvider } from "canvaskit-wasm";

import { BUILTIN_PARAGRAPH_FONT_URL } from "../fonts/builtin.ts";
import { registerDefaultParagraphFont } from "../fonts/load-default-paragraph-font.ts";
import { setParagraphMeasureContext } from "../layout/paragraph-measure-context.ts";
import { loadYoga, type Yoga } from "../layout/yoga.ts";
import { initCanvasKit } from "../render/canvaskit.ts";
import { canvasKitLocateFile, DEFAULT_CANVASKIT_WASM_URL } from "../render/locate.ts";

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
  | { status: "loading"; progress: RuntimeLoadProgress }
  | { status: "ready"; runtime: Runtime }
  /**
   * 初始化链（Yoga / CanvasKit / 默认段落字体等）任一步失败。
   * `error.message` 适合展示给用户；`error.stack` 可用于调试。
   */
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

export type RuntimeLoadProgress = {
  percent: number;
  wasm: { loaded: number; total: number | null; done: boolean };
  font: { loaded: number; total: number | null; done: boolean };
};

type BinaryProgress = { loaded: number; total: number | null; done: boolean };

function toFiniteNumber(input: string | null): number | null {
  if (input == null) return null;
  const n = Number.parseInt(input, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function computeProgressPercent(wasm: BinaryProgress, font: BinaryProgress): number {
  if (wasm.total != null && font.total != null) {
    const loaded = wasm.loaded + font.loaded;
    const total = wasm.total + font.total;
    return Math.max(0, Math.min(100, Math.round((loaded / total) * 100)));
  }
  const unit = (p: BinaryProgress) => (p.total != null ? p.loaded / p.total : p.done ? 1 : 0.05);
  const avg = (unit(wasm) + unit(font)) / 2;
  return Math.max(0, Math.min(100, Math.round(avg * 100)));
}

async function fetchBinaryWithProgress(
  url: string,
  onProgress: (progress: BinaryProgress) => void,
): Promise<ArrayBuffer> {
  if (typeof window === "undefined" && url.startsWith("/")) {
    const { readFile } = await import("node:fs/promises");
    const { resolve } = await import("node:path");
    const maybeWorkspacePath = resolve(process.cwd(), `.${url}`);
    const fileBuffer = await readFile(maybeWorkspacePath);
    const bytes = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
    const out = bytes.slice().buffer;
    onProgress({ loaded: bytes.byteLength, total: bytes.byteLength, done: true });
    return out;
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[@react-canvas/core-v2] Binary fetch failed HTTP ${res.status} for ${url}`);
  }
  const total = toFiniteNumber(res.headers.get("content-length"));
  if (res.body == null) {
    const buf = await res.arrayBuffer();
    onProgress({ loaded: buf.byteLength, total: total ?? buf.byteLength, done: true });
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  onProgress({ loaded, total, done: false });
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress({ loaded, total, done: false });
  }
  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  onProgress({ loaded, total: total ?? loaded, done: true });
  return merged.buffer;
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
    let wasmProgress: BinaryProgress = { loaded: 0, total: null, done: false };
    let fontProgress: BinaryProgress = { loaded: 0, total: null, done: false };
    const emitLoadingProgress = () => {
      setSnapshot({
        status: "loading",
        progress: {
          percent: computeProgressPercent(wasmProgress, fontProgress),
          wasm: wasmProgress,
          font: fontProgress,
        },
      });
    };
    emitLoadingProgress();
    const opts = firstOptions;
    const shouldLoadDefaultParagraphFonts = opts?.loadDefaultParagraphFonts !== false;
    const defaultParagraphFontUrl = opts?.defaultParagraphFontUrl ?? BUILTIN_PARAGRAPH_FONT_URL;
    const wasmUrl = DEFAULT_CANVASKIT_WASM_URL;
    const wasmBinaryPromise = fetchBinaryWithProgress(wasmUrl, (next) => {
      wasmProgress = next;
      emitLoadingProgress();
    });
    const paragraphFontDataPromise = shouldLoadDefaultParagraphFonts
      ? fetchBinaryWithProgress(defaultParagraphFontUrl, (next) => {
          fontProgress = next;
          emitLoadingProgress();
        }).then(
          (fontData) => ({ ok: true as const, fontData }),
          (error) => ({ ok: false as const, error }),
        )
      : null;
    if (!paragraphFontDataPromise) {
      fontProgress = { loaded: 0, total: 0, done: true };
      emitLoadingProgress();
    }
    runtimePromise = Promise.all([loadYoga(), wasmBinaryPromise])
      .then(async ([yoga, wasmBinary]) => {
        const wasmBlobUrl = URL.createObjectURL(
          new Blob([wasmBinary], { type: "application/wasm" }),
        );
        try {
          const canvasKit = await initCanvasKit({
            locateFile: (file: string) =>
              file.endsWith(".wasm") ? wasmBlobUrl : canvasKitLocateFile(file),
          });
          return [yoga, canvasKit] as const;
        } finally {
          URL.revokeObjectURL(wasmBlobUrl);
        }
      })
      .then(async ([yoga, canvasKit]) => {
        let paragraphFontProvider: TypefaceFontProvider | null = null;
        let defaultParagraphFontFamily = "";
        if (paragraphFontDataPromise) {
          const fontLoad = await paragraphFontDataPromise;
          if (!fontLoad.ok) {
            throw fontLoad.error;
          }
          const loaded = registerDefaultParagraphFont(canvasKit, fontLoad.fontData);
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
