import type { InteractionHandlers, ViewStyle } from "@react-canvas/core";
import { View } from "@react-canvas/react";
import { useContext, type ReactNode } from "react";
import { mergeViewStyles } from "../../style/merge.ts";
import { CanvasThemeContext } from "../../theme/context.tsx";
import type { CanvasToken } from "../../theme/types.ts";
import {
  getDividerLineStyle,
  getDividerSegmentStyle,
  type DividerOrientation,
} from "./variants.ts";

export type DividerProps = {
  orientation?: DividerOrientation;
  style?: ViewStyle;
  children?: ReactNode;
  /**
   * 在 **react-reconciler** 子树（如 `<Canvas>` 内）中无法读到外层 `CanvasThemeProvider` 的 Context，
   * 须从外层传入 `getCanvasToken(...)` / `useCanvasToken()` 的结果。
   */
  token?: CanvasToken;
} & InteractionHandlers;

export function Divider(props: DividerProps) {
  const ctx = useContext(CanvasThemeContext);
  const { token: tokenProp, orientation = "horizontal", style, children, ...handlers } = props;
  const token = tokenProp ?? ctx?.token;
  if (!token) {
    throw new Error(
      "[@react-canvas/ui] Divider: pass `token` when used under <Canvas>, or wrap the app with CanvasThemeProvider.",
    );
  }

  const lineStroke = getDividerLineStyle(orientation, token);

  if (children === undefined || children === null) {
    return <View style={mergeViewStyles(lineStroke, style)} {...handlers} />;
  }

  const gap = token.paddingSM;
  const isHorizontal = orientation === "horizontal";
  const segmentStyle = getDividerSegmentStyle(orientation, token);

  return (
    <View
      style={mergeViewStyles(
        {
          flexDirection: isHorizontal ? "row" : "column",
          alignItems: "center",
          gap,
          alignSelf: "stretch",
        },
        style,
      )}
      {...handlers}
    >
      <View style={segmentStyle} />
      <View style={{ flexShrink: 0 }}>{children}</View>
      <View style={segmentStyle} />
    </View>
  );
}
