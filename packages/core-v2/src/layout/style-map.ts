import type { Node as YogaNode } from "yoga-layout/load";
import { Edge, FlexDirection } from "yoga-layout/load";

/** react-v2 `<View style>` 首版子集（可逐步扩展）。 */
export type ViewStyle = {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  flex?: number;
  flexDirection?: "row" | "column";
  padding?: number;
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
}
