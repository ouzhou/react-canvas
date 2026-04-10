import type { InteractionHandlers, ViewStyle } from "@react-canvas/core";
import type { ReactNode } from "react";

/** 宿主类型字符串，供 `react-reconciler` `createInstance` 使用（同 `View`）。 */
export const ScrollView = "ScrollView" as const;

/**
 * V1：纵向滚动为主；`horizontal` 为占位，横向滚动未实现（见路线图 Step 9 规格）。
 */
export type ScrollViewProps = {
  style?: ViewStyle;
  /** `true` 时沿 X 轴消费滚轮（见 core §17）。 */
  horizontal?: boolean;
  /** 与 imperative 一致：指针进入可滚动区域时显示滚动条。 */
  scrollbarHoverVisible?: boolean;
  children?: ReactNode;
} & InteractionHandlers;
