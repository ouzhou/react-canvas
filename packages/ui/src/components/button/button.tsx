import type { InteractionHandlers, ViewStyle } from "@react-canvas/core";
import { View } from "@react-canvas/react";
import { useContext, type ReactNode } from "react";
import { mergeViewStyles } from "../../style/merge.ts";
import { CanvasThemeContext } from "../../theme/context.tsx";
import type { CanvasToken } from "../../theme/types.ts";
import { getButtonStyles, type ButtonSize, type ButtonVariant } from "./variants.ts";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
  children?: ReactNode;
  /**
   * 在 **react-reconciler** 子树（如 `<Canvas>` 内）中无法读到外层 `CanvasThemeProvider` 的 Context，
   * 须从外层传入 `getCanvasToken(...)` / `useCanvasToken()` 的结果。
   */
  token?: CanvasToken;
} & InteractionHandlers;

export function Button(props: ButtonProps) {
  const ctx = useContext(CanvasThemeContext);
  const {
    token: tokenProp,
    variant = "primary",
    size = "md",
    disabled,
    style,
    children,
    ...handlers
  } = props;
  const token = tokenProp ?? ctx?.token;
  if (!token) {
    throw new Error(
      "[@react-canvas/ui] Button: pass `token` when used under <Canvas>, or wrap the app with CanvasThemeProvider.",
    );
  }
  const base: ViewStyle = {
    borderRadius: token.borderRadius,
    alignItems: "center",
    justifyContent: "center",
  };
  const merged = mergeViewStyles(
    base,
    getButtonStyles(variant, size, token),
    disabled ? { opacity: 0.5 } : {},
    style,
  );
  return (
    <View style={merged} {...handlers}>
      {children}
    </View>
  );
}
