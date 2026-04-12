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

export const STYLE_DEMO_CASES: ReadonlyArray<{
  id: StyleDemoCase;
  label: string;
  hint: string;
}> = [
  {
    id: "margin-gap",
    label: "margin + gap",
    hint: "行向 gap；首块 marginTop、次块左右 margin。",
  },
  {
    id: "padding-wrap",
    label: "padding + wrap",
    hint: "paddingTop 覆盖四边 padding；flexWrap 换行。",
  },
  {
    id: "flex-longhands",
    label: "flexGrow / Shrink / Basis",
    hint: "无 flex 数字，仅用 grow+shrink+basis 占满剩余宽。",
  },
  {
    id: "flex-reverse",
    label: "row-reverse",
    hint: "flexDirection: row-reverse，子项沿主轴从末端开始排。",
  },
  {
    id: "opacity",
    label: "opacity 组透明",
    hint: "滑块调左半透明块与下行父容器 α；右为不透明参照；子块仍带自身 opacity。",
  },
  {
    id: "aspect-overflow",
    label: "aspectRatio + overflow",
    hint: "固定宽 + aspectRatio 推导高；子项宽于父；overflow hidden + borderRadius 15%（Skia 裁剪/圆角）。",
  },
  {
    id: "style-button",
    label: "圆角按钮 + hover",
    hint: "常规按钮：圆角、白字居中；hover 时 cursor 为 pointer、背景变浅（React 用 style 函数；Core 用 patchStyle）。",
  },
];
