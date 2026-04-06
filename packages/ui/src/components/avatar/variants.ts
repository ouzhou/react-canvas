import type { ViewStyle } from "@react-canvas/core";
import type { CanvasToken } from "../../theme/types.ts";

export type AvatarSizePreset = "sm" | "md" | "lg";

export function resolveAvatarPixelSize(
  size: number | AvatarSizePreset | undefined,
  token: CanvasToken,
): number {
  if (typeof size === "number") return size;
  switch (size) {
    case "sm":
      return Math.round(token.fontSizeMD + token.paddingSM);
    case "lg":
      return Math.round(token.fontSizeMD * 2 + token.paddingMD);
    case "md":
    default:
      return Math.round(token.fontSizeMD + token.paddingMD);
  }
}

export function getAvatarContainerStyle(px: number, token: CanvasToken): ViewStyle {
  const r = px / 2;
  return {
    position: "relative",
    width: px,
    height: px,
    borderRadius: r,
    overflow: "hidden",
    backgroundColor: token.colorBorder,
    alignItems: "center",
    justifyContent: "center",
  };
}

/** 在 {@link AvatarGroup} 内为头像增加「白边」分隔重叠区域（暗色主题为版面背景色）。 */
export function getAvatarGroupRingStyle(token: CanvasToken): ViewStyle {
  const light = token.colorText.startsWith("rgba(0,");
  return {
    borderWidth: 2,
    borderColor: light ? "#ffffff" : token.colorBgLayout,
  };
}
