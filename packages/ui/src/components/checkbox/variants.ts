import type { ViewStyle } from "@react-canvas/core";
import type { CanvasToken } from "../../theme/types.ts";

export type CheckboxSize = "sm" | "md";

export function checkboxBoxSize(size: CheckboxSize): number {
  return size === "sm" ? 14 : 18;
}

/** 未选中：白底（浅色）/ 抬起面（深色），圆角略大以贴近系统设置里的复选框。 */
function checkboxUncheckedBackground(token: CanvasToken): string {
  if (token.colorText.startsWith("rgba(0,")) {
    return "#ffffff";
  }
  return token.colorBgHover;
}

function checkboxUncheckedBorderColor(token: CanvasToken): string {
  if (token.colorText.startsWith("rgba(0,")) {
    return "#d1d5db";
  }
  return token.colorBorder;
}

export function getCheckboxStyles(size: CheckboxSize, token: CanvasToken): ViewStyle {
  const dim = checkboxBoxSize(size);
  const corner = Math.max(4, Math.round((dim * 5) / 18));
  return {
    width: dim,
    height: dim,
    borderRadius: corner,
    borderWidth: 1,
    borderColor: checkboxUncheckedBorderColor(token),
    backgroundColor: checkboxUncheckedBackground(token),
    alignItems: "center",
    justifyContent: "center",
  };
}

export function getCheckboxCheckedStyles(token: CanvasToken): ViewStyle {
  return {
    backgroundColor: token.colorPrimary,
    borderColor: token.colorPrimary,
  };
}
