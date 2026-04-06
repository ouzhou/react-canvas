import type { ViewStyle } from "@react-canvas/core";
import type { CanvasToken } from "../../theme/types.ts";

export type CheckboxSize = "sm" | "md";

export function checkboxBoxSize(size: CheckboxSize): number {
  return size === "sm" ? 14 : 18;
}

export function getCheckboxStyles(size: CheckboxSize, token: CanvasToken): ViewStyle {
  const dim = checkboxBoxSize(size);
  return {
    width: dim,
    height: dim,
    borderRadius: token.borderRadius / 2,
    borderWidth: 1,
    borderColor: token.colorBorder,
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
