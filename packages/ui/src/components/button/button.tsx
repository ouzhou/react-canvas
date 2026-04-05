import type { InteractionHandlers, ViewStyle } from "@react-canvas/core";
import { View } from "@react-canvas/react";
import type { ReactNode } from "react";
import { mergeViewStyles } from "../../style/merge.ts";
import { useCanvasToken } from "../../theme/context.tsx";
import { getButtonStyles, type ButtonSize, type ButtonVariant } from "./variants.ts";

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
  children?: ReactNode;
} & InteractionHandlers;

export function Button(props: ButtonProps) {
  const token = useCanvasToken();
  const { variant = "primary", size = "md", disabled, style, children, ...handlers } = props;
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
