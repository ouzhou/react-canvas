import type { Node as YogaNode } from "yoga-layout/load";
import { Align, Edge, FlexDirection, Justify, PositionType } from "yoga-layout/load";

/** react-v2 `<View style>` 首版子集（可逐步扩展）。 */
export type ViewStyle = {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  flex?: number;
  flexDirection?: "row" | "column";
  /**
   * 主轴对齐（传给 Yoga `justifyContent`）。未设置时由 Yoga 默认（等价 flex-start）。
   */
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  /**
   * 交叉轴对齐（传给 Yoga `alignItems`）。未设置时由 Yoga 默认（常见为 stretch）。
   */
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  padding?: number;
  /** 默认相对定位；`absolute` 时配合 `left`/`top` 等与父叠放（父需有确定宽高）。 */
  position?: "relative" | "absolute";
  left?: number;
  top?: number;
  /** 例如 `#e8f4fc`；未设置时 Skia 不绘制该节点矩形 */
  backgroundColor?: string;
  /**
   * 命中测试（第一期：`auto` | `none`）。`none` 时本节点及子树不参与指针目标（与 RN 一致）。
   * 不传给 Yoga；未设置时视为 `auto`。
   */
  pointerEvents?: "auto" | "none";
  /** 与 CSS `cursor` 一致；不传给 Yoga，仅用于解析画布光标。 */
  cursor?: string;
  /** 文本节点（`kind: "text"`）段落字号；不传 Yoga，供测量与 Skia 绘制。 */
  fontSize?: number;
  /** 文本颜色（`#rrggbb`）；不传 Yoga，M3 与 `TextFlatRun.color` 合并。 */
  color?: string;
  /** 默认字体族名；不传 Yoga。 */
  fontFamily?: string;
  /** 字重；不传 Yoga。 */
  fontWeight?: "normal" | "bold" | number;
  /**
   * 文本行距倍率，对应 Skia `TextStyle.heightMultiplier`（约等于 CSS 无单位 `line-height`）。
   * 默认 `1`；例如 `1.75` 行更疏。不传 Yoga，仅段落测量与绘制使用。
   */
  lineHeight?: number;
};

const flexDirectionMap = {
  row: FlexDirection.Row,
  column: FlexDirection.Column,
} as const;

const justifyContentMap = {
  "flex-start": Justify.FlexStart,
  center: Justify.Center,
  "flex-end": Justify.FlexEnd,
  "space-between": Justify.SpaceBetween,
  "space-around": Justify.SpaceAround,
  "space-evenly": Justify.SpaceEvenly,
} as const satisfies Record<NonNullable<ViewStyle["justifyContent"]>, Justify>;

const alignItemsMap = {
  "flex-start": Align.FlexStart,
  center: Align.Center,
  "flex-end": Align.FlexEnd,
  stretch: Align.Stretch,
  baseline: Align.Baseline,
} as const satisfies Record<NonNullable<ViewStyle["alignItems"]>, Align>;

function setWidthSmart(node: YogaNode, v: ViewStyle["width"]): void {
  if (v === undefined) return;
  if (typeof v === "string" && v.endsWith("%")) {
    node.setWidthPercent(Number.parseFloat(v));
  } else if (typeof v === "number") {
    node.setWidth(v);
  }
}

function setHeightSmart(node: YogaNode, v: ViewStyle["height"]): void {
  if (v === undefined) return;
  if (typeof v === "string" && v.endsWith("%")) {
    node.setHeightPercent(Number.parseFloat(v));
  } else if (typeof v === "number") {
    node.setHeight(v);
  }
}

/**
 * 将节点所有布局相关 yoga 属性还原为默认值（不调用 `node.reset()`，
 * 因为 Yoga 不允许对仍挂载在父节点上的节点调用 reset()）。
 * 调用后须重新执行 `applyRNLayoutDefaults` + `applyStylesToYoga`。
 */
export function clearYogaLayoutStyle(node: YogaNode): void {
  node.setFlexDirection(FlexDirection.Column);
  node.setFlexShrink(0);
  node.setAlignContent(Align.FlexStart);
  node.setWidthAuto();
  node.setHeightAuto();
  node.setFlex(0);
  node.setPadding(Edge.All, 0);
  node.setPositionType(PositionType.Relative);
  node.setPositionAuto(Edge.Left);
  node.setPositionAuto(Edge.Top);
  node.setJustifyContent(Justify.FlexStart);
  node.setAlignItems(Align.Stretch);
}

/** 将 `ViewStyle` 应用到 Yoga 节点（增量：仅设置出现的字段）。 */
export function applyStylesToYoga(node: YogaNode, style: ViewStyle): void {
  if (style.width !== undefined) setWidthSmart(node, style.width);
  if (style.height !== undefined) setHeightSmart(node, style.height);
  if (style.flex !== undefined) node.setFlex(style.flex);
  if (style.flexDirection !== undefined) {
    node.setFlexDirection(flexDirectionMap[style.flexDirection]);
  }
  if (style.justifyContent !== undefined) {
    node.setJustifyContent(justifyContentMap[style.justifyContent]);
  }
  if (style.alignItems !== undefined) {
    node.setAlignItems(alignItemsMap[style.alignItems]);
  }
  if (style.padding !== undefined) {
    node.setPadding(Edge.All, style.padding);
  }
  if (style.position !== undefined) {
    node.setPositionType(
      style.position === "absolute" ? PositionType.Absolute : PositionType.Relative,
    );
  }
  if (style.left !== undefined) {
    node.setPosition(Edge.Left, style.left);
  }
  if (style.top !== undefined) {
    node.setPosition(Edge.Top, style.top);
  }
}
