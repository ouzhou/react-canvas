import type { ViewStyle } from "@react-canvas/core";
import type { ReactNode } from "react";

/**
 * Host type string for the canvas `react-reconciler` (`createInstance`), same idea as
 * `export const Rect = 'Rect'` in react-konva — not a react-dom component.
 */
export const View = "View" as const;

/** Props for the `"View"` host node (see `jsx-augment.d.ts` for `<View />` in JSX). */
export type ViewProps = {
  style?: ViewStyle;
  children?: ReactNode;
};
