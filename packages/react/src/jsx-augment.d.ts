import type {
  ImageSource,
  InteractionHandlers,
  ResizeMode,
  SvgPathStrokeLinecap,
  SvgPathStrokeLinejoin,
  TextStyle,
  ViewStyle,
} from "@react-canvas/core";
import type { ReactNode } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      View: {
        style?: ViewStyle;
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
