/** 与 URL `demo=style` 画布内子场景对应；Core / React 共用 id 与语义。 */
export type StyleDemoCase =
  | "margin-gap"
  | "padding-wrap"
  | "flex-longhands"
  | "flex-reverse"
  | "aspect-overflow";

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
    id: "aspect-overflow",
    label: "aspectRatio + overflow",
    hint: "固定宽 + aspectRatio 推导高；子项宽于父且 overflow: hidden。",
  },
];
