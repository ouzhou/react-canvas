import type { CanvasKit } from "canvaskit-wasm";

import { ensureDefaultParagraphFonts } from "../text/default-paragraph-font.ts";
import { initCanvasKit } from "../render/canvaskit.ts";
import { initYoga } from "../layout/yoga.ts";
import type { Yoga } from "../layout/yoga.ts";

export type CanvasRuntime = {
  yoga: Yoga;
  canvasKit: CanvasKit;
};

export type InitCanvasRuntimeOptions = {
  /**
   * When `true` (default), fetch and register a built-in CJK-capable font for `<Text>` / Paragraph.
   * Set to `false` if you call `setParagraphFontForTests` before init, or in tests without network.
   */
  loadDefaultParagraphFonts?: boolean;
  /** Override built-in font URL (fetched as ArrayBuffer). Ignored when `loadDefaultParagraphFonts` is `false`. */
  defaultParagraphFontUrl?: string;
};

let yogaInitPromise: Promise<Yoga> | null = null;
let canvasKitInitPromise: Promise<CanvasKit> | null = null;

function getYogaSingleton(): Promise<Yoga> {
  yogaInitPromise ??= initYoga();
  return yogaInitPromise;
}

function getCanvasKitSingleton(): Promise<CanvasKit> {
  canvasKitInitPromise ??= initCanvasKit();
  return canvasKitInitPromise;
}

/**
 * Parallel Yoga + CanvasKit + (by default) default paragraph font fetch for browser or any WASM host.
 * Applications do not need to call `fetch` for fonts unless they opt out here and register bytes themselves.
 *
 * Yoga 与 CanvasKit 在进程内只初始化一次并复用，避免多个 `<CanvasProvider>` 并发重复加载 WASM 导致部分实例失败。
 */
export async function initCanvasRuntime(
  options?: InitCanvasRuntimeOptions,
): Promise<CanvasRuntime> {
  const [yoga, canvasKit] = await Promise.all([
    getYogaSingleton(),
    getCanvasKitSingleton(),
    options?.loadDefaultParagraphFonts === false
      ? Promise.resolve()
      : ensureDefaultParagraphFonts({ url: options?.defaultParagraphFontUrl }),
  ]);
  return { yoga, canvasKit };
}
