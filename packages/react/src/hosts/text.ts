import type { InteractionHandlers, TextStyle } from "@react-canvas/core";
import type { ReactNode } from "react";

/** Host type string for `react-reconciler` (`createInstance`), same pattern as `View`. */
export const Text = "Text" as const;

export type TextProps = {
  style?: TextStyle;
  children?: ReactNode;
} & InteractionHandlers;
