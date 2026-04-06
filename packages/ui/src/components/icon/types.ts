import type { InteractionHandlers, ViewStyle } from "@react-canvas/core";
import type { LucideIconData } from "./icon-node-to-paths.ts";

export type { LucideIconData } from "./icon-node-to-paths.ts";

export type IconProps = {
  icon: LucideIconData;
  size?: number;
  color?: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  style?: ViewStyle;
  onError?: (error: unknown) => void;
} & InteractionHandlers;
