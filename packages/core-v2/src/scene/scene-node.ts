import type { Node as YogaNode } from "yoga-layout/load";
import type { ViewStyle } from "../layout/style-map.ts";

/** 场景树节点；布局为 Yoga `getComputedLayout()` 同步后的相对父级盒。 */
export type SceneNode = {
  id: string;
  parentId: string | null;
  children: string[];
  yogaNode: YogaNode;
  /** 调试/测试用可读 id */
  label?: string;
  /** 当前累积的 View 样式（用于 `updateStyle` 合并后重算 Yoga）。 */
  viewStyle?: ViewStyle;
  layout: { left: number; top: number; width: number; height: number } | null;
};
