import type { ViewStyle } from "@react-canvas/core";
import type { CanvasToken } from "../../theme/types.ts";

export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "sm" | "md";

export function getButtonStyles(
  variant: ButtonVariant,
  size: ButtonSize,
  token: CanvasToken,
): ViewStyle {
  const padH = size === "sm" ? token.paddingSM : token.paddingMD;
  const padV = size === "sm" ? token.paddingSM : token.paddingSM;
  const base: ViewStyle = {
    paddingHorizontal: padH,
    paddingVertical: padV,
  };
  if (variant === "primary") {
    return {
      ...base,
      backgroundColor: token.colorPrimary,
      borderWidth: 0,
    };
  }
  return {
    ...base,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: token.colorBorder,
  };
}
