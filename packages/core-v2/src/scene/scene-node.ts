import type { Node as YogaNode } from "yoga-layout/load";

/** 场景树节点；布局为 Yoga `getComputedLayout()` 同步后的相对父级盒。 */
export type SceneNode = {
  id: string;
  parentId: string | null;
  children: string[];
  yogaNode: YogaNode;
  /** 调试/测试用可读 id */
  label?: string;
  layout: { left: number; top: number; width: number; height: number } | null;
};
