import type { Node as YogaNode } from "yoga-layout/load";
import {
  Align,
  Display,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  Overflow,
  PositionType,
  Wrap,
} from "yoga-layout/load";
import type { DimensionValue, ViewStyle } from "./view-style.ts";

function parseDimension(v: DimensionValue | undefined): number | "auto" | `${number}%` | undefined {
  if (v === undefined) return undefined;
  if (v === "auto") return "auto";
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.endsWith("%")) return v as `${number}%`;
  return undefined;
}

function parseMargin(
  v: number | "auto" | `${number}%` | undefined,
): number | "auto" | `${number}%` | undefined {
  return v;
}

function setWidthSmart(node: YogaNode, v: DimensionValue | undefined): void {
  const p = parseDimension(v);
  if (p === undefined) return;
  if (p === "auto") node.setWidthAuto();
  else if (typeof p === "string") node.setWidthPercent(Number.parseFloat(p));
  else node.setWidth(p);
}

function setHeightSmart(node: YogaNode, v: DimensionValue | undefined): void {
  const p = parseDimension(v);
  if (p === undefined) return;
  if (p === "auto") node.setHeightAuto();
  else if (typeof p === "string") node.setHeightPercent(Number.parseFloat(p));
  else node.setHeight(p);
}

function setMinWidthSmart(node: YogaNode, v: DimensionValue | undefined): void {
  const p = parseDimension(v);
  if (p === undefined) return;
  if (typeof p === "string") node.setMinWidthPercent(Number.parseFloat(p));
  else node.setMinWidth(p);
}

function setMaxWidthSmart(node: YogaNode, v: DimensionValue | undefined): void {
  const p = parseDimension(v);
  if (p === undefined) return;
  if (typeof p === "string") node.setMaxWidthPercent(Number.parseFloat(p));
  else node.setMaxWidth(p);
}

function setMinHeightSmart(node: YogaNode, v: DimensionValue | undefined): void {
  const p = parseDimension(v);
  if (p === undefined) return;
  if (typeof p === "string") node.setMinHeightPercent(Number.parseFloat(p));
  else node.setMinHeight(p);
}

function setMaxHeightSmart(node: YogaNode, v: DimensionValue | undefined): void {
  const p = parseDimension(v);
  if (p === undefined) return;
  if (typeof p === "string") node.setMaxHeightPercent(Number.parseFloat(p));
  else node.setMaxHeight(p);
}

function setMarginSmart(
  node: YogaNode,
  edge: Edge,
  v: number | "auto" | `${number}%` | undefined,
): void {
  if (v === undefined) return;
  if (v === "auto") node.setMarginAuto(edge);
  else if (typeof v === "string") node.setMarginPercent(edge, Number.parseFloat(v));
  else node.setMargin(edge, v);
}

function setPaddingSmart(node: YogaNode, edge: Edge, v: number | `${number}%` | undefined): void {
  if (v === undefined) return;
  if (typeof v === "string") node.setPaddingPercent(edge, Number.parseFloat(v));
  else node.setPadding(edge, v);
}

function setPositionSmart(node: YogaNode, edge: Edge, v: DimensionValue | undefined): void {
  if (v === undefined) return;
  if (v === "auto") return;
  if (typeof v === "string" && v.endsWith("%")) node.setPositionPercent(edge, Number.parseFloat(v));
  else if (typeof v === "number") node.setPosition(edge, v);
}

function setGapSmart(node: YogaNode, gutter: Gutter, v: number | `${number}%` | undefined): void {
  if (v === undefined) return;
  if (typeof v === "string") node.setGapPercent(gutter, Number.parseFloat(v));
  else node.setGap(gutter, v);
}

const flexDirectionMap: Record<NonNullable<ViewStyle["flexDirection"]>, FlexDirection> = {
  column: FlexDirection.Column,
  "column-reverse": FlexDirection.ColumnReverse,
  row: FlexDirection.Row,
  "row-reverse": FlexDirection.RowReverse,
};

const flexWrapMap: Record<NonNullable<ViewStyle["flexWrap"]>, Wrap> = {
  nowrap: Wrap.NoWrap,
  wrap: Wrap.Wrap,
  "wrap-reverse": Wrap.WrapReverse,
};

const justifyMap: Record<NonNullable<ViewStyle["justifyContent"]>, Justify> = {
  "flex-start": Justify.FlexStart,
  center: Justify.Center,
  "flex-end": Justify.FlexEnd,
  "space-between": Justify.SpaceBetween,
  "space-around": Justify.SpaceAround,
  "space-evenly": Justify.SpaceEvenly,
};

const alignItemsMap: Record<NonNullable<ViewStyle["alignItems"]>, Align> = {
  auto: Align.Auto,
  "flex-start": Align.FlexStart,
  center: Align.Center,
  "flex-end": Align.FlexEnd,
  stretch: Align.Stretch,
  baseline: Align.Baseline,
};

const alignSelfMap: Record<NonNullable<ViewStyle["alignSelf"]>, Align> = {
  auto: Align.Auto,
  "flex-start": Align.FlexStart,
  center: Align.Center,
  "flex-end": Align.FlexEnd,
  stretch: Align.Stretch,
  baseline: Align.Baseline,
};

const alignContentMap: Record<NonNullable<ViewStyle["alignContent"]>, Align> = {
  "flex-start": Align.FlexStart,
  center: Align.Center,
  "flex-end": Align.FlexEnd,
  stretch: Align.Stretch,
  "space-between": Align.SpaceBetween,
  "space-around": Align.SpaceAround,
  "space-evenly": Align.SpaceEvenly,
};

/** React Native–aligned defaults (see phase-1-design §1.3). */
export function applyRNLayoutDefaults(node: YogaNode): void {
  node.setFlexDirection(FlexDirection.Column);
  node.setFlexShrink(0);
  node.setAlignContent(Align.FlexStart);
}

const VISUAL_KEYS = new Set([
  "backgroundColor",
  "borderRadius",
  "borderWidth",
  "borderColor",
  "opacity",
]);

export function splitStyle(style: ViewStyle): {
  layout: Record<string, unknown>;
  visual: ViewStyle;
} {
  const layout: Record<string, unknown> = {};
  const visual: ViewStyle = {};
  for (const [k, val] of Object.entries(style)) {
    if (val === undefined) continue;
    if (VISUAL_KEYS.has(k)) {
      (visual as Record<string, unknown>)[k] = val;
    } else {
      layout[k] = val;
    }
  }
  return { layout, visual };
}

export function applyStylesToYoga(node: YogaNode, style: ViewStyle): void {
  const { layout } = splitStyle(style);
  const s = { ...layout, display: style.display } as ViewStyle;

  if (s.width !== undefined) setWidthSmart(node, s.width);
  if (s.height !== undefined) setHeightSmart(node, s.height);
  if (s.minWidth !== undefined) setMinWidthSmart(node, s.minWidth);
  if (s.maxWidth !== undefined) setMaxWidthSmart(node, s.maxWidth);
  if (s.minHeight !== undefined) setMinHeightSmart(node, s.minHeight);
  if (s.maxHeight !== undefined) setMaxHeightSmart(node, s.maxHeight);

  if (s.flex !== undefined) {
    node.setFlex(s.flex);
  }
  if (s.flexGrow !== undefined) node.setFlexGrow(s.flexGrow);
  if (s.flexShrink !== undefined) node.setFlexShrink(s.flexShrink);
  if (s.flexBasis !== undefined) {
    const b = s.flexBasis;
    if (b === "auto") node.setFlexBasisAuto();
    else if (typeof b === "string") node.setFlexBasisPercent(Number.parseFloat(b));
    else node.setFlexBasis(b);
  }

  if (s.flexDirection !== undefined) node.setFlexDirection(flexDirectionMap[s.flexDirection]);
  if (s.flexWrap !== undefined) node.setFlexWrap(flexWrapMap[s.flexWrap]);
  if (s.justifyContent !== undefined) node.setJustifyContent(justifyMap[s.justifyContent]);
  if (s.alignItems !== undefined) node.setAlignItems(alignItemsMap[s.alignItems]);
  if (s.alignSelf !== undefined) node.setAlignSelf(alignSelfMap[s.alignSelf]);
  if (s.alignContent !== undefined) node.setAlignContent(alignContentMap[s.alignContent]);

  if (s.margin !== undefined) {
    const m = parseMargin(s.margin);
    setMarginSmart(node, Edge.All, m);
  }
  if (s.marginHorizontal !== undefined) {
    const m = parseMargin(s.marginHorizontal);
    setMarginSmart(node, Edge.Horizontal, m);
  }
  if (s.marginVertical !== undefined) {
    const m = parseMargin(s.marginVertical);
    setMarginSmart(node, Edge.Vertical, m);
  }
  if (s.marginLeft !== undefined) setMarginSmart(node, Edge.Left, parseMargin(s.marginLeft));
  if (s.marginRight !== undefined) setMarginSmart(node, Edge.Right, parseMargin(s.marginRight));
  if (s.marginTop !== undefined) setMarginSmart(node, Edge.Top, parseMargin(s.marginTop));
  if (s.marginBottom !== undefined) setMarginSmart(node, Edge.Bottom, parseMargin(s.marginBottom));

  if (s.padding !== undefined) {
    const p = s.padding;
    setPaddingSmart(node, Edge.All, p);
  }
  if (s.paddingHorizontal !== undefined) {
    setPaddingSmart(node, Edge.Horizontal, s.paddingHorizontal);
  }
  if (s.paddingVertical !== undefined) {
    setPaddingSmart(node, Edge.Vertical, s.paddingVertical);
  }
  if (s.paddingLeft !== undefined) setPaddingSmart(node, Edge.Left, s.paddingLeft);
  if (s.paddingRight !== undefined) setPaddingSmart(node, Edge.Right, s.paddingRight);
  if (s.paddingTop !== undefined) setPaddingSmart(node, Edge.Top, s.paddingTop);
  if (s.paddingBottom !== undefined) setPaddingSmart(node, Edge.Bottom, s.paddingBottom);

  if (s.gap !== undefined) {
    setGapSmart(node, Gutter.All, s.gap);
  }
  if (s.columnGap !== undefined) setGapSmart(node, Gutter.Column, s.columnGap);
  if (s.rowGap !== undefined) setGapSmart(node, Gutter.Row, s.rowGap);

  if (s.position === "absolute") node.setPositionType(PositionType.Absolute);
  else if (s.position === "relative") node.setPositionType(PositionType.Relative);

  if (s.top !== undefined) setPositionSmart(node, Edge.Top, s.top);
  if (s.right !== undefined) setPositionSmart(node, Edge.Right, s.right);
  if (s.bottom !== undefined) setPositionSmart(node, Edge.Bottom, s.bottom);
  if (s.left !== undefined) setPositionSmart(node, Edge.Left, s.left);

  if (s.display === "none") node.setDisplay(Display.None);
  else if (s.display === "flex") node.setDisplay(Display.Flex);

  if (s.aspectRatio !== undefined) node.setAspectRatio(s.aspectRatio);

  node.setOverflow(Overflow.Visible);
}

/**
 * Yoga 3+ forbids `node.reset()` while the node has a parent or children (see `Node::reset()` in
 * facebook/yoga). Commit-time style updates must re-apply without calling `reset()`.
 *
 * When `style` explicitly sets a layout key to `undefined` (merged update semantics), clear that
 * key on the Yoga node before applying defaults + the remaining style.
 */
function applyExplicitUndefinedLayoutClears(node: YogaNode, style: ViewStyle): void {
  const raw = style as Record<string, unknown>;
  const u = (k: keyof ViewStyle) =>
    Object.prototype.hasOwnProperty.call(raw, k) && raw[k as string] === undefined;

  if (u("width")) node.setWidth(undefined);
  if (u("height")) node.setHeight(undefined);
  if (u("minWidth")) node.setMinWidth(undefined);
  if (u("maxWidth")) node.setMaxWidth(undefined);
  if (u("minHeight")) node.setMinHeight(undefined);
  if (u("maxHeight")) node.setMaxHeight(undefined);

  if (u("flex")) node.setFlex(undefined);
  if (u("flexGrow")) node.setFlexGrow(undefined);
  if (u("flexShrink")) node.setFlexShrink(undefined);
  if (u("flexBasis")) node.setFlexBasis(undefined);

  if (u("flexDirection")) node.setFlexDirection(FlexDirection.Column);
  if (u("flexWrap")) node.setFlexWrap(Wrap.NoWrap);
  if (u("justifyContent")) node.setJustifyContent(Justify.FlexStart);
  if (u("alignItems")) node.setAlignItems(Align.Stretch);
  if (u("alignSelf")) node.setAlignSelf(Align.Auto);
  if (u("alignContent")) node.setAlignContent(Align.FlexStart);

  if (u("margin")) node.setMargin(Edge.All, undefined);
  if (u("marginHorizontal")) node.setMargin(Edge.Horizontal, undefined);
  if (u("marginVertical")) node.setMargin(Edge.Vertical, undefined);
  if (u("marginLeft")) node.setMargin(Edge.Left, undefined);
  if (u("marginRight")) node.setMargin(Edge.Right, undefined);
  if (u("marginTop")) node.setMargin(Edge.Top, undefined);
  if (u("marginBottom")) node.setMargin(Edge.Bottom, undefined);

  if (u("padding")) node.setPadding(Edge.All, undefined);
  if (u("paddingHorizontal")) node.setPadding(Edge.Horizontal, undefined);
  if (u("paddingVertical")) node.setPadding(Edge.Vertical, undefined);
  if (u("paddingLeft")) node.setPadding(Edge.Left, undefined);
  if (u("paddingRight")) node.setPadding(Edge.Right, undefined);
  if (u("paddingTop")) node.setPadding(Edge.Top, undefined);
  if (u("paddingBottom")) node.setPadding(Edge.Bottom, undefined);

  if (u("gap")) node.setGap(Gutter.All, undefined);
  if (u("columnGap")) node.setGap(Gutter.Column, undefined);
  if (u("rowGap")) node.setGap(Gutter.Row, undefined);

  if (u("position")) node.setPositionType(PositionType.Relative);
  if (u("top")) node.setPosition(Edge.Top, undefined);
  if (u("right")) node.setPosition(Edge.Right, undefined);
  if (u("bottom")) node.setPosition(Edge.Bottom, undefined);
  if (u("left")) node.setPosition(Edge.Left, undefined);

  if (u("display")) node.setDisplay(Display.Flex);
  if (u("aspectRatio")) node.setAspectRatio(undefined);
}

/** Re-apply RN defaults + full style for commit updates (no `node.reset()` — Yoga 3 incompatible). */
export function resetAndApplyStyles(node: YogaNode, style: ViewStyle): void {
  applyExplicitUndefinedLayoutClears(node, style);
  applyRNLayoutDefaults(node);
  applyStylesToYoga(node, style);
}
