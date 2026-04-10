import type {
  InteractionHandlers,
  InteractionState,
  ViewNode,
  ViewStyle,
} from "@react-canvas/core";
import type { ReactNode, RefObject } from "react";

/**
 * Host type string for the canvas `react-reconciler` (`createInstance`), same idea as
 * `export const Rect = 'Rect'` in react-konva — not a react-dom component.
 */
export const View = "View" as const;

/** Props for the `"View"` host node (see `jsx-augment.d.ts` for `<View />` in JSX). */
export type ViewProps = {
  style?: ViewStyle;
  children?: ReactNode;
  /** 由 reconciler 写入对应场景 `ViewNode`，卸载时清空；供 `useCanvasClickAway` 等做命中边界。 */
  viewNodeRef?: RefObject<ViewNode | null>;
  /** 与 imperative `ViewNode.onInteractionStateChange` 一致（§14 hover / pressed / focused）。 */
  onInteractionStateChange?: (state: InteractionState) => void;
} & InteractionHandlers;
