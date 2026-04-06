import type { ViewStyle } from "@react-canvas/core";
import type { CanvasToken } from "../../theme/types.ts";

export type DividerOrientation = "horizontal" | "vertical";

/**
 * 单条线段（1 逻辑像素厚），用于纯 `Divider` 或带文案时两侧线段。
 */
export function getDividerLineStyle(
  orientation: DividerOrientation,
  token: CanvasToken,
): ViewStyle {
  const base: ViewStyle = {
    backgroundColor: token.colorBorder,
  };
  if (orientation === "horizontal") {
    return {
      ...base,
      height: 1,
      alignSelf: "stretch",
    };
  }
  return {
    ...base,
    width: 1,
    alignSelf: "stretch",
  };
}

/** `getDividerLineStyle` 的别名，便于与 `getButtonStyles` 命名并列。 */
export const getDividerStyles = getDividerLineStyle;

/**
 * 带文案时两侧线段：主轴方向 `flexGrow: 1` 均分空间；**不含** `alignSelf: 'stretch'`，
 * 避免在 row/column 内把线段在交叉轴上拉满。
 */
export function getDividerSegmentStyle(
  orientation: DividerOrientation,
  token: CanvasToken,
): ViewStyle {
  if (orientation === "horizontal") {
    return {
      backgroundColor: token.colorBorder,
      height: 1,
      flexGrow: 1,
      minWidth: 0,
    };
  }
  return {
    backgroundColor: token.colorBorder,
    width: 1,
    flexGrow: 1,
    minHeight: 0,
  };
}
