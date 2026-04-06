import type { ViewStyle } from "@react-canvas/core";
import { lightenTowardsWhite } from "../../theme/algorithms.ts";
import type { CanvasToken } from "../../theme/types.ts";

export type SelectSize = "sm" | "md";

export function selectTriggerPadding(size: SelectSize, token: CanvasToken): number {
  return size === "sm" ? token.paddingSM : token.paddingMD;
}

export function selectFontSize(size: SelectSize, token: CanvasToken): number {
  return size === "sm" ? token.fontSizeSM : token.fontSizeMD;
}

export function getSelectTriggerShellStyle(
  size: SelectSize,
  token: CanvasToken,
  opts: { disabled: boolean },
): ViewStyle {
  const pad = selectTriggerPadding(size, token);
  return {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: pad,
    paddingVertical: pad,
    borderRadius: token.borderRadius,
    borderWidth: 1,
    borderColor: token.colorBorder,
    backgroundColor: token.colorBgHover,
    cursor: opts.disabled ? "default" : "pointer",
    opacity: opts.disabled ? 0.5 : 1,
  };
}

/**
 * 下拉浮层实色背景：与页面 `colorBgLayout` 区分，避免与触发条或底图糊成一片。
 * 亮色：白底；暗色（布局 `#141414`）：使用抬升的 `colorBgHover`。
 */
export function selectPopoverBackground(token: CanvasToken): string {
  const layout = token.colorBgLayout.trim().toLowerCase();
  if (layout === "#141414") {
    return token.colorBgHover;
  }
  return "#ffffff";
}

/** 下拉浮层：相对触发器锚点 `position: relative` 的父节点，贴齐宽度并画在下方。 */
export function getSelectPanelStyle(token: CanvasToken): ViewStyle {
  const gap = Math.max(4, Math.round(token.paddingSM / 2));
  return {
    position: "absolute",
    left: 0,
    right: 0,
    top: "100%",
    marginTop: gap,
    flexDirection: "column",
    borderRadius: token.borderRadius,
    borderWidth: 1,
    borderColor: token.colorBorder,
    backgroundColor: selectPopoverBackground(token),
  };
}

export function getSelectOptionRowStyle(
  token: CanvasToken,
  opts: { hovered: boolean; selected: boolean },
): ViewStyle {
  const pad = token.paddingSM;
  const base: ViewStyle = {
    paddingHorizontal: pad,
    paddingVertical: pad,
    cursor: "pointer",
  };
  if (opts.selected) {
    return { ...base, backgroundColor: lightenTowardsWhite(token.colorPrimary, 0.88) };
  }
  if (opts.hovered) {
    return { ...base, backgroundColor: token.colorBgHover };
  }
  return base;
}
