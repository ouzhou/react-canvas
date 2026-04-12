/** opacity 子场景：滑块整数百分比，除以 100 写入 `ViewStyle.opacity`。 */
export const STYLE_OPACITY_SLIDER_MIN = 5;
export const STYLE_OPACITY_SLIDER_MAX = 100;
export const STYLE_OPACITY_SLIDER_DEFAULT = 50;

/** 与 URL `demo=style` 画布内子场景对应；Core / React 共用 id 与语义。 */
export type StyleDemoCase =
  | "margin-gap"
  | "padding-wrap"
  | "flex-longhands"
  | "flex-reverse"
  | "opacity"
  | "aspect-overflow"
  | "style-button";
