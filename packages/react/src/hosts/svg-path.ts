import type {
  InteractionHandlers,
  SvgPathStrokeLinecap,
  SvgPathStrokeLinejoin,
  ViewStyle,
} from "@react-canvas/core";
import type { ReactNode } from "react";

/** Host type string for `react-reconciler` (`createInstance`). */
export const SvgPath = "SvgPath" as const;

export type SvgPathProps = {
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
