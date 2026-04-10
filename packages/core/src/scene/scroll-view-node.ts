import { Overflow } from "yoga-layout/load";
import type { Yoga } from "yoga-layout/load";
import type { ViewStyle } from "../style/view-style.ts";
import { ViewNode } from "./view-node.ts";

/** 与 `paint.ts` / `hit-test.ts` 共用，保证绘制与命中一致。 */
export const SCROLLBAR_VERTICAL_INSET = 3;
export const SCROLLBAR_VERTICAL_WIDTH = 10;

export type VerticalScrollMetrics = {
  maxScrollY: number;
  contentHeight: number;
  viewportW: number;
  viewportH: number;
  trackLeft: number;
  trackTop: number;
  trackH: number;
  barW: number;
  thumbTop: number;
  thumbH: number;
};

/** 可滚动时返回轨道/滑块几何；否则 `null`（不绘滚动条）。 */
export function getVerticalScrollMetrics(sv: ScrollViewNode): VerticalScrollMetrics | null {
  const vpW = sv.layout.width;
  const vpH = sv.layout.height;
  const first = sv.children[0] as ViewNode | undefined;
  const contentH = first ? first.layout.height : 0;
  const maxY = Math.max(0, contentH - vpH);
  if (maxY <= 0 || vpH <= 4 || vpW <= 8) return null;

  const inset = SCROLLBAR_VERTICAL_INSET;
  const barW = SCROLLBAR_VERTICAL_WIDTH;
  const trackLeft = vpW - inset - barW;
  const trackTop = inset;
  const trackH = vpH - 2 * inset;
  if (trackH < 12) return null;

  const thumbH = Math.max(20, Math.min(trackH, (vpH / contentH) * trackH));
  const travel = Math.max(0, trackH - thumbH);
  const thumbTop = trackTop + (maxY > 0 ? (sv.scrollY / maxY) * travel : 0);

  return {
    maxScrollY: maxY,
    contentHeight: contentH,
    viewportW: vpW,
    viewportH: vpH,
    trackLeft,
    trackTop,
    trackH,
    barW,
    thumbTop,
    thumbH,
  };
}

/** 视口局部坐标下是否落在垂直滚动条轨道内（整条可拖拽区域）。 */
export function isLocalPointOnVerticalScrollbar(
  sv: ScrollViewNode,
  localX: number,
  localY: number,
): boolean {
  const m = getVerticalScrollMetrics(sv);
  if (!m) return false;
  return (
    localX >= m.trackLeft &&
    localX < m.trackLeft + m.barW &&
    localY >= m.trackTop &&
    localY < m.trackTop + m.trackH
  );
}

/**
 * 画布内滚动容器（阶段四 Step 9）。子节点量测高度可大于视口；`scrollX`/`scrollY` 为内容偏移。
 */
export class ScrollViewNode extends ViewNode {
  scrollX = 0;
  scrollY = 0;
  /** `true` 时只沿 X 轴滚轮消费（见 `core-design.md` §17.6）；默认 `false` 为纵向。 */
  horizontal = false;
  /**
   * `auto`：边界处剩余增量传给父 `ScrollView`；`contain`/`none`：本层在边界处吃掉链式（§17.5）。
   */
  overscrollBehavior: "auto" | "contain" | "none" = "auto";
  /** 指针进入视口且可垂直滚动时由宿主置为 `true`，离开画布或不再处于该 `ScrollView` 内为 `false`；仅此时绘制滚动条。 */
  scrollbarHoverVisible = false;

  get contentWidth(): number {
    const first = this.children[0] as ViewNode | undefined;
    return first ? first.layout.width : 0;
  }

  get contentHeight(): number {
    const first = this.children[0] as ViewNode | undefined;
    return first ? first.layout.height : 0;
  }

  get viewportWidth(): number {
    return this.layout.width;
  }

  get viewportHeight(): number {
    return this.layout.height;
  }

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
