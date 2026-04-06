import type { InteractionHandlers, ViewStyle } from "@react-canvas/core";
import type { ReactNode } from "react";

/** 宿主类型字符串，供 `react-reconciler` `createInstance` 使用（同 `View`）。 */
export const ScrollView = "ScrollView" as const;

/**
 * V1：纵向滚动为主；`horizontal` 为占位，横向滚动未实现（见路线图 Step 9 规格）。
 */
export type ScrollViewProps = {
  style?: ViewStyle;
  /** V1 未实现横向滚动；保留 API 供后续对齐 RN。 */
  horizontal?: boolean;
  children?: ReactNode;
} & InteractionHandlers;
