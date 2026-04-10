import type {
  ImageSource,
  InteractionHandlers,
  InteractionState,
  ResizeMode,
  SvgPathStrokeLinecap,
  SvgPathStrokeLinejoin,
  TextStyle,
  ViewStyle,
} from "@react-canvas/core";
import type { ViewNode } from "@react-canvas/core";
import type { ReactNode, RefObject } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      View: {
        style?: ViewStyle;
        children?: ReactNode;
        viewNodeRef?: RefObject<ViewNode | null>;
        onInteractionStateChange?: (state: InteractionState) => void;
      } & InteractionHandlers;
      ScrollView: {
        style?: ViewStyle;
        horizontal?: boolean;
        scrollbarHoverVisible?: boolean;
        children?: ReactNode;
      } & InteractionHandlers;
      Text: {
        style?: TextStyle;
        children?: ReactNode;
      } & InteractionHandlers;
      Image: {
        source: ImageSource;
        style?: ViewStyle;
        resizeMode?: ResizeMode;
        onLoad?: () => void;
        onError?: (error: unknown) => void;
        children?: ReactNode;
      } & InteractionHandlers;
      SvgPath: {
        d: string;
        viewBox?: string;
        size?: number;
        color?: string;
        stroke?: string;
        fill?: string;
        strokeWidth?: number;
        strokeLinecap?: SvgPathStrokeLinecap;
        strokeLinejoin?: SvgPathStrokeLinejoin;
        style?: ViewStyle;
        onError?: (error: unknown) => void;
        children?: ReactNode;
      } & InteractionHandlers;
    }
  }
}

export {};
