import type { Node as YogaNode } from "yoga-layout/load";
import { Align, Edge, FlexDirection, PositionType } from "yoga-layout/load";

/** react-v2 `<View style>` 首版子集（可逐步扩展）。 */
export type ViewStyle = {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  flex?: number;
  flexDirection?: "row" | "column";
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
};

const flexDirectionMap = {
  row: FlexDirection.Row,
  column: FlexDirection.Column,
} as const;

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
}

/** 将 `ViewStyle` 应用到 Yoga 节点（增量：仅设置出现的字段）。 */
export function applyStylesToYoga(node: YogaNode, style: ViewStyle): void {
  if (style.width !== undefined) setWidthSmart(node, style.width);
  if (style.height !== undefined) setHeightSmart(node, style.height);
  if (style.flex !== undefined) node.setFlex(style.flex);
  if (style.flexDirection !== undefined) {
    node.setFlexDirection(flexDirectionMap[style.flexDirection]);
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
