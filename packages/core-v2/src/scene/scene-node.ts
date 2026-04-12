import type { Node as YogaNode } from "yoga-layout/load";
import type { ImageObjectFit } from "../media/image-object-fit.ts";
import type { ViewStyle } from "../layout/style-map.ts";
import type { TextFlatRun } from "../text/text-flat-run.ts";

export type SceneNodeKind = "view" | "text" | "scrollView" | "image" | "svgPath";

/** 场景树节点；布局为 Yoga `getComputedLayout()` 同步后的相对父级盒。 */
export type SceneNode = {
  id: string;
  parentId: string | null;
  children: string[];
  yogaNode: YogaNode;
  /** 缺省为 `view`，与旧节点兼容。 */
  kind?: SceneNodeKind;
  /** 仅 `kind === "scrollView"`；纵向内容偏移（px），缺省为 `0`。 */
  scrollY?: number;
  /** `kind === "text"` 时的纯文本（M1）；与 {@link textRuns} 二选一或并存（并存时测量以 `textRuns` 为准）。 */
  textContent?: string;
  /** M3：扁平多样式片段；存在且非空时 Paragraph 测量/绘制用此字段。 */
  textRuns?: TextFlatRun[];
  /** 调试/测试用可读 id */
  label?: string;
  /** 当前累积的 View 样式（用于 `updateStyle` 合并后重算 Yoga）。 */
  viewStyle?: ViewStyle;
  /** `kind === "image"` */
  imageUri?: string;
  imageObjectFit?: ImageObjectFit;
  /** `kind === "svgPath"` */
  svgPathD?: string;
  svgViewBox?: string;
  svgStroke?: string;
  svgFill?: string;
  svgStrokeWidth?: number;
  layout: { left: number; top: number; width: number; height: number } | null;
};
