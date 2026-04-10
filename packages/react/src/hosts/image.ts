import type { ImageSource, InteractionHandlers, ResizeMode, ViewStyle } from "@react-canvas/core";
import type { ReactNode } from "react";

/** Host type string for `react-reconciler` (`createInstance`), same pattern as `View`. */
export const Image = "Image" as const;

export type ImageProps = {
  source: ImageSource;
  style?: ViewStyle;
  resizeMode?: ResizeMode;
  onLoad?: () => void;
  onError?: (error: unknown) => void;
  children?: ReactNode;
} & InteractionHandlers;
