import type { RuntimeOptions } from "@react-canvas/core-v2";

/** jsdom 单测不拉 CDN 字体；与 stub `initCanvasKit` 一致。 */
export const vitestRuntimeInitOptions = {
  loadDefaultParagraphFonts: false,
} as const satisfies RuntimeOptions;
