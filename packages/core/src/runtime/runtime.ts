import type { CanvasKit } from "canvaskit-wasm";

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

export {
  initCanvasRuntime,
  initCanvasRuntime as preloadCanvasRuntime,
  subscribeCanvasRuntimeInit,
  getCanvasRuntimeInitSnapshot,
  getCanvasRuntimeInitServerSnapshot,
  getFontOptionsFingerprint,
  initRuntime,
  subscribeRuntimeInit,
  getRuntimeSnapshot,
  getRuntimeServerSnapshot,
  type CanvasRuntimeInitSnapshot,
} from "./runtime-init-store.ts";

/** 与 `core-design.md` §2 对齐的文档化类型名 */
export type Runtime = CanvasRuntime;
export type RuntimeOptions = InitCanvasRuntimeOptions;
export type { CanvasRuntimeInitSnapshot as RuntimeInitSnapshot } from "./runtime-init-store.ts";
