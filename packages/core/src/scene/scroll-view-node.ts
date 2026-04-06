import { Overflow } from "yoga-layout/load";
import type { Yoga } from "yoga-layout/load";
import type { ViewStyle } from "../style/view-style.ts";
import { ViewNode } from "./view-node.ts";

/**
 * 画布内滚动容器（阶段四 Step 9）。子节点量测高度可大于视口；`scrollX`/`scrollY` 为内容偏移。
 */
export class ScrollViewNode extends ViewNode {
  scrollX = 0;
  scrollY = 0;

  constructor(yoga: Yoga) {
    super(yoga, "ScrollView");
    this.yogaNode.setOverflow(Overflow.Scroll);
    /** 视口始终裁剪子内容（与 RN ScrollView 一致）；Yoga 侧用 `Overflow.Scroll` 量测可滚动内容。 */
    this.props.overflow = "hidden";
  }

  override setStyle(style: ViewStyle): void {
    super.setStyle(style);
    this.yogaNode.setOverflow(Overflow.Scroll);
    this.props.overflow = "hidden";
  }

  override updateStyle(oldStyle: ViewStyle, newStyle: ViewStyle): void {
    super.updateStyle(oldStyle, newStyle);
    this.yogaNode.setOverflow(Overflow.Scroll);
    this.props.overflow = "hidden";
  }

  /** 在 Yoga `syncLayoutFromYoga` 之后调用，按内容与视口尺寸钳制偏移。 */
  clampScrollOffsetsAfterLayout(): void {
    const vp = this.layout.height;
    const contentH = this.children[0] ? (this.children[0] as ViewNode).layout.height : 0;
    const maxY = Math.max(0, contentH - vp);
    this.scrollY = Math.min(maxY, Math.max(0, this.scrollY));

    const vpW = this.layout.width;
    const contentW = this.children[0] ? (this.children[0] as ViewNode).layout.width : 0;
    const maxX = Math.max(0, contentW - vpW);
    this.scrollX = Math.min(maxX, Math.max(0, this.scrollX));
  }
}
