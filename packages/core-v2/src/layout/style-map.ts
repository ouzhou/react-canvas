import type { Node as YogaNode } from "yoga-layout/load";
import {
  Align,
  Edge,
  FlexDirection,
  Gutter,
  Justify,
  Overflow,
  PositionType,
  Wrap,
} from "yoga-layout/load";

/** 与 `width`/`height` 一致：px 或百分比字符串，供 Yoga 映射字段复用。 */
export type YogaLength = number | `${number}%`;

/** 文本装饰线关键词（与 Skia / CSS 对齐）。 */
export type TextDecorationLineKeyword = "underline" | "overline" | "line-through";

export type TextDecorationLineStyle =
  | "none"
  | TextDecorationLineKeyword
  | readonly TextDecorationLineKeyword[];

export type TextDecorationStyleCss = "solid" | "double" | "dotted" | "dashed" | "wavy";

export type TextAlignStyle = "left" | "right" | "center" | "justify" | "start" | "end";

/** 与 CSS `font-style` 一致；`oblique` 映射为 Skia Italic。 */
export type FontStyleCss = "normal" | "italic" | "oblique";

/** react-v2 `<View style>` 首版子集（可逐步扩展）。 */
export type ViewStyle = {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  flex?: number;
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  /**
   * 主轴对齐（传给 Yoga `justifyContent`）。未设置时由 Yoga 默认（等价 flex-start）。
   */
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  /**
   * 交叉轴对齐（传给 Yoga `alignItems`）。未设置时由 Yoga 默认（常见为 stretch）。
   */
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  /** 四边相同 padding（px）；单边见 `paddingTop` 等，单边优先于本字段。 */
  padding?: number;
  paddingTop?: YogaLength;
  paddingRight?: YogaLength;
  paddingBottom?: YogaLength;
  paddingLeft?: YogaLength;
  /** 四边相同 margin；单边见 `marginTop` 等，单边优先于本字段。 */
  margin?: YogaLength;
  marginTop?: YogaLength;
  marginRight?: YogaLength;
  marginBottom?: YogaLength;
  marginLeft?: YogaLength;
  minWidth?: YogaLength;
  maxWidth?: YogaLength;
  minHeight?: YogaLength;
  maxHeight?: YogaLength;
  /** 默认相对定位；`absolute` 时配合 `left`/`top` 等与父叠放（父需有确定宽高）。 */
  position?: "relative" | "absolute";
  left?: number;
  top?: number;
  right?: YogaLength;
  bottom?: YogaLength;
  /** 例如 `#e8f4fc`；未设置时 Skia 不绘制该节点矩形 */
  backgroundColor?: string;
  /**
   * 不透明度 `0`–`1`（与 RN/CSS 一致）。不传 Yoga；由布局快照带给 Skia 做组透明。
   * 缺省视为 `1`。非法值在写入快照时按 {@link clampOpacityForSnapshot} 处理。
   */
  opacity?: number;
  /**
   * 命中测试（第一期：`auto` | `none`）。`none` 时本节点及子树不参与指针目标（与 RN 一致）。
   * 不传给 Yoga；未设置时视为 `auto`。
   */
  pointerEvents?: "auto" | "none";
  /** 与 CSS `cursor` 一致；不传给 Yoga，仅用于解析画布光标。 */
  cursor?: string;
  /** 文本节点（`kind: "text"`）段落字号；不传 Yoga，供测量与 Skia 绘制。 */
  fontSize?: number;
  /**
   * 文本颜色；不传 Yoga。支持 `CanvasKit.parseColorString` 能识别的 CSS 串（含 `rgba()` 等），
   * 并兼容 `#rgb` / `#rrggbb`。
   */
  color?: string;
  /** 默认字体族名；不传 Yoga。 */
  fontFamily?: string;
  /** 字重；不传 Yoga。 */
  fontWeight?: "normal" | "bold" | number;
  /**
   * 文本行距倍率，对应 Skia `TextStyle.heightMultiplier`（约等于 CSS 无单位 `line-height`）。
   * 默认 `1`；例如 `1.75` 行更疏。不传 Yoga，仅段落测量与绘制使用。
   */
  lineHeight?: number;
  /**
   * 段落水平对齐；不传 Yoga，对应 Skia `ParagraphStyle.textAlign`。
   * `start`/`end` 使用 Skia `Start`/`End`。
   */
  textAlign?: TextAlignStyle;
  /**
   * 文本装饰线；`none` 或省略表示无。数组表示多条线同时生效（类似 CSS 多值）。
   */
  textDecorationLine?: TextDecorationLineStyle;
  /** 与 CSS `text-decoration-style` 一致。 */
  textDecorationStyle?: TextDecorationStyleCss;
  /** 装饰线粗细（px）；默认 `1`。 */
  textDecorationThickness?: number;
  /**
   * 装饰线颜色；默认与 {@link ViewStyle.color} 相同。
   * 解析规则与 `color` 一致。
   */
  textDecorationColor?: string;
  /** 字距增量（px），对应 Skia `letterSpacing`。 */
  letterSpacing?: number;
  /** 词距增量（px），对应 Skia `wordSpacing`。 */
  wordSpacing?: number;
  /** 与 CSS `font-style` 一致。 */
  fontStyle?: FontStyleCss;
  /**
   * 显式字体回退顺序；不传 Yoga。
   * 未设置时由 `fontFamily` 按逗号拆分（支持简单引号包裹，见 `splitCssFontFamilyList`）。
   */
  fontFamilies?: readonly string[];
  gap?: YogaLength;
  rowGap?: YogaLength;
  columnGap?: YogaLength;
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  alignContent?:
    | "flex-start"
    | "flex-end"
    | "center"
    | "stretch"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignSelf?: "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | `${number}%` | "auto";
  /**
   * 与 CSS `overflow` 一致；传给 Yoga（绘制层裁剪另 spec）。
   */
  overflow?: "visible" | "hidden" | "scroll";
  /**
   * 圆角半径：px 数字，或相对本节点布局盒的百分比（如 `"50%"`）。
   * 不传 Yoga；仅布局快照与 Skia 使用。
   */
  borderRadius?: number | `${number}%`;
  /** 宽高比（`width` / `height`）；未设置时由 Yoga 默认。 */
  aspectRatio?: number;
};

/** 布局快照中透传的文本排版字段（供绘制与调试）。 */
export type TextLayoutStyleSnapshot = Pick<
  ViewStyle,
  | "color"
  | "fontSize"
  | "fontFamily"
  | "fontWeight"
  | "lineHeight"
  | "fontFamilies"
  | "textAlign"
  | "textDecorationLine"
  | "textDecorationStyle"
  | "textDecorationThickness"
  | "textDecorationColor"
  | "letterSpacing"
  | "wordSpacing"
  | "fontStyle"
>;

/** `TextFlatRun` 可覆盖的文本样式字段（不含段落级 `textAlign`）。 */
export type TextRunStylePatch = Omit<TextLayoutStyleSnapshot, "textAlign">;

const flexDirectionMap = {
  row: FlexDirection.Row,
  column: FlexDirection.Column,
  "row-reverse": FlexDirection.RowReverse,
  "column-reverse": FlexDirection.ColumnReverse,
} as const satisfies Record<NonNullable<ViewStyle["flexDirection"]>, FlexDirection>;

const overflowMap = {
  visible: Overflow.Visible,
  hidden: Overflow.Hidden,
  scroll: Overflow.Scroll,
} as const satisfies Record<NonNullable<ViewStyle["overflow"]>, Overflow>;

const justifyContentMap = {
  "flex-start": Justify.FlexStart,
  center: Justify.Center,
  "flex-end": Justify.FlexEnd,
  "space-between": Justify.SpaceBetween,
  "space-around": Justify.SpaceAround,
  "space-evenly": Justify.SpaceEvenly,
} as const satisfies Record<NonNullable<ViewStyle["justifyContent"]>, Justify>;

const alignItemsMap = {
  "flex-start": Align.FlexStart,
  center: Align.Center,
  "flex-end": Align.FlexEnd,
  stretch: Align.Stretch,
  baseline: Align.Baseline,
} as const satisfies Record<NonNullable<ViewStyle["alignItems"]>, Align>;

const alignContentMap = {
  "flex-start": Align.FlexStart,
  "flex-end": Align.FlexEnd,
  center: Align.Center,
  stretch: Align.Stretch,
  "space-between": Align.SpaceBetween,
  "space-around": Align.SpaceAround,
  "space-evenly": Align.SpaceEvenly,
} as const satisfies Record<NonNullable<ViewStyle["alignContent"]>, Align>;

const alignSelfMap = {
  auto: Align.Auto,
  "flex-start": Align.FlexStart,
  center: Align.Center,
  "flex-end": Align.FlexEnd,
  stretch: Align.Stretch,
  baseline: Align.Baseline,
} as const satisfies Record<NonNullable<ViewStyle["alignSelf"]>, Align>;

const flexWrapMap = {
  nowrap: Wrap.NoWrap,
  wrap: Wrap.Wrap,
  "wrap-reverse": Wrap.WrapReverse,
} as const satisfies Record<NonNullable<ViewStyle["flexWrap"]>, Wrap>;

function setWidthSmart(node: YogaNode, v: ViewStyle["width"]): void {
  if (v === undefined) return;
  if (typeof v === "string" && v.endsWith("%")) {
    node.setWidthPercent(Number.parseFloat(v));
  } else if (typeof v === "number") {
    node.setWidth(v);
  }
}

function setHeightSmart(node: YogaNode, v: ViewStyle["height"]): void {
  if (v === undefined) return;
  if (typeof v === "string" && v.endsWith("%")) {
    node.setHeightPercent(Number.parseFloat(v));
  } else if (typeof v === "number") {
    node.setHeight(v);
  }
}

function setYogaLengthMargin(node: YogaNode, edge: Edge, v: YogaLength): void {
  if (typeof v === "string" && v.endsWith("%")) {
    node.setMarginPercent(edge, Number.parseFloat(v));
  } else {
    node.setMargin(edge, v);
  }
}

function setYogaLengthPadding(node: YogaNode, edge: Edge, v: YogaLength): void {
  if (typeof v === "string" && v.endsWith("%")) {
    node.setPaddingPercent(edge, Number.parseFloat(v));
  } else {
    node.setPadding(edge, v);
  }
}

function setYogaLengthPosition(node: YogaNode, edge: Edge, v: YogaLength): void {
  if (typeof v === "string" && v.endsWith("%")) {
    node.setPositionPercent(edge, Number.parseFloat(v));
  } else {
    node.setPosition(edge, v);
  }
}

function setMinWidthSmart(node: YogaNode, v: YogaLength): void {
  if (typeof v === "string" && v.endsWith("%")) {
    node.setMinWidthPercent(Number.parseFloat(v));
  } else {
    node.setMinWidth(v);
  }
}

function setMaxWidthSmart(node: YogaNode, v: YogaLength): void {
  if (typeof v === "string" && v.endsWith("%")) {
    node.setMaxWidthPercent(Number.parseFloat(v));
  } else {
    node.setMaxWidth(v);
  }
}

function setMinHeightSmart(node: YogaNode, v: YogaLength): void {
  if (typeof v === "string" && v.endsWith("%")) {
    node.setMinHeightPercent(Number.parseFloat(v));
  } else {
    node.setMinHeight(v);
  }
}

function setMaxHeightSmart(node: YogaNode, v: YogaLength): void {
  if (typeof v === "string" && v.endsWith("%")) {
    node.setMaxHeightPercent(Number.parseFloat(v));
  } else {
    node.setMaxHeight(v);
  }
}

function resolvePaddingEdge(
  style: ViewStyle,
  edge: "Top" | "Right" | "Bottom" | "Left",
): YogaLength | undefined {
  const shorthand = style.padding;
  const top = style.paddingTop;
  const right = style.paddingRight;
  const bottom = style.paddingBottom;
  const left = style.paddingLeft;
  const specific =
    edge === "Top" ? top : edge === "Right" ? right : edge === "Bottom" ? bottom : left;
  if (specific !== undefined) return specific;
  if (shorthand !== undefined) return shorthand;
  return undefined;
}

function resolveMarginEdge(
  style: ViewStyle,
  edge: "Top" | "Right" | "Bottom" | "Left",
): YogaLength | undefined {
  const shorthand = style.margin;
  const top = style.marginTop;
  const right = style.marginRight;
  const bottom = style.marginBottom;
  const left = style.marginLeft;
  const specific =
    edge === "Top" ? top : edge === "Right" ? right : edge === "Bottom" ? bottom : left;
  if (specific !== undefined) return specific;
  if (shorthand !== undefined) return shorthand;
  return undefined;
}

function hasAnyPaddingField(style: ViewStyle): boolean {
  return (
    style.padding !== undefined ||
    style.paddingTop !== undefined ||
    style.paddingRight !== undefined ||
    style.paddingBottom !== undefined ||
    style.paddingLeft !== undefined
  );
}

function hasAnyMarginField(style: ViewStyle): boolean {
  return (
    style.margin !== undefined ||
    style.marginTop !== undefined ||
    style.marginRight !== undefined ||
    style.marginBottom !== undefined ||
    style.marginLeft !== undefined
  );
}

function applyPaddingEdges(node: YogaNode, style: ViewStyle): void {
  if (!hasAnyPaddingField(style)) return;
  const pt = resolvePaddingEdge(style, "Top");
  const pr = resolvePaddingEdge(style, "Right");
  const pb = resolvePaddingEdge(style, "Bottom");
  const pl = resolvePaddingEdge(style, "Left");
  setYogaLengthPadding(node, Edge.Top, pt ?? 0);
  setYogaLengthPadding(node, Edge.Right, pr ?? 0);
  setYogaLengthPadding(node, Edge.Bottom, pb ?? 0);
  setYogaLengthPadding(node, Edge.Left, pl ?? 0);
}

function applyMarginEdges(node: YogaNode, style: ViewStyle): void {
  if (!hasAnyMarginField(style)) return;
  const mt = resolveMarginEdge(style, "Top");
  const mr = resolveMarginEdge(style, "Right");
  const mb = resolveMarginEdge(style, "Bottom");
  const ml = resolveMarginEdge(style, "Left");
  setYogaLengthMargin(node, Edge.Top, mt ?? 0);
  setYogaLengthMargin(node, Edge.Right, mr ?? 0);
  setYogaLengthMargin(node, Edge.Bottom, mb ?? 0);
  setYogaLengthMargin(node, Edge.Left, ml ?? 0);
}

function setGapAxis(
  node: YogaNode,
  gutter: Gutter,
  rowGapLen: YogaLength | undefined,
  columnGapLen: YogaLength | undefined,
): void {
  const v = gutter === Gutter.Row ? rowGapLen : columnGapLen;
  if (v === undefined) return;
  if (typeof v === "string" && v.endsWith("%")) {
    node.setGapPercent(gutter, Number.parseFloat(v));
  } else {
    node.setGap(gutter, v);
  }
}

/**
 * 将节点所有布局相关 yoga 属性还原为默认值（不调用 `node.reset()`，
 * 因为 Yoga 不允许对仍挂载在父节点上的节点调用 reset()）。
 * 调用后须重新执行 `applyRNLayoutDefaults` + `applyStylesToYoga`。
 */
export function clearYogaLayoutStyle(node: YogaNode): void {
  node.setFlexDirection(FlexDirection.Column);
  node.setFlexShrink(0);
  node.setAlignContent(Align.FlexStart);
  node.setWidthAuto();
  node.setHeightAuto();
  node.setFlex(0);
  node.setPadding(Edge.All, 0);
  node.setMargin(Edge.Left, 0);
  node.setMargin(Edge.Top, 0);
  node.setMargin(Edge.Right, 0);
  node.setMargin(Edge.Bottom, 0);
  node.setMinWidth(undefined);
  node.setMaxWidth(undefined);
  node.setMinHeight(undefined);
  node.setMaxHeight(undefined);
  node.setPositionType(PositionType.Relative);
  node.setPositionAuto(Edge.Left);
  node.setPositionAuto(Edge.Top);
  node.setPositionAuto(Edge.Right);
  node.setPositionAuto(Edge.Bottom);
  node.setJustifyContent(Justify.FlexStart);
  node.setAlignItems(Align.Stretch);
  node.setAlignSelf(Align.Auto);
  node.setFlexWrap(Wrap.NoWrap);
  node.setGap(Gutter.Row, undefined);
  node.setGap(Gutter.Column, undefined);
  node.setFlexGrow(0);
  node.setFlexBasis(undefined);
  node.setOverflow(Overflow.Visible);
  node.setAspectRatio(undefined);
}

/** 将 `ViewStyle` 应用到 Yoga 节点（增量：仅设置出现的字段）。 */
export function applyStylesToYoga(node: YogaNode, style: ViewStyle): void {
  if (style.width !== undefined) setWidthSmart(node, style.width);
  if (style.height !== undefined) setHeightSmart(node, style.height);

  if (typeof style.flex === "number") {
    node.setFlex(style.flex);
  } else {
    if (style.flexGrow !== undefined) node.setFlexGrow(style.flexGrow);
    if (style.flexShrink !== undefined) node.setFlexShrink(style.flexShrink);
    if (style.flexBasis !== undefined) {
      if (style.flexBasis === "auto") {
        node.setFlexBasisAuto();
      } else if (typeof style.flexBasis === "string" && style.flexBasis.endsWith("%")) {
        node.setFlexBasisPercent(Number.parseFloat(style.flexBasis));
      } else if (typeof style.flexBasis === "number") {
        node.setFlexBasis(style.flexBasis);
      }
    }
  }

  if (style.flexDirection !== undefined) {
    node.setFlexDirection(flexDirectionMap[style.flexDirection]);
  }
  if (style.flexWrap !== undefined) {
    node.setFlexWrap(flexWrapMap[style.flexWrap]);
  }
  if (style.justifyContent !== undefined) {
    node.setJustifyContent(justifyContentMap[style.justifyContent]);
  }
  if (style.alignItems !== undefined) {
    node.setAlignItems(alignItemsMap[style.alignItems]);
  }
  if (style.alignContent !== undefined) {
    node.setAlignContent(alignContentMap[style.alignContent]);
  }
  if (style.alignSelf !== undefined) {
    node.setAlignSelf(alignSelfMap[style.alignSelf]);
  }

  applyPaddingEdges(node, style);
  applyMarginEdges(node, style);

  if (style.minWidth !== undefined) setMinWidthSmart(node, style.minWidth);
  if (style.maxWidth !== undefined) setMaxWidthSmart(node, style.maxWidth);
  if (style.minHeight !== undefined) setMinHeightSmart(node, style.minHeight);
  if (style.maxHeight !== undefined) setMaxHeightSmart(node, style.maxHeight);

  const rowGap = style.rowGap ?? style.gap;
  const columnGap = style.columnGap ?? style.gap;
  if (style.gap !== undefined || style.rowGap !== undefined || style.columnGap !== undefined) {
    setGapAxis(node, Gutter.Row, rowGap, columnGap);
    setGapAxis(node, Gutter.Column, rowGap, columnGap);
  }

  if (style.overflow !== undefined) {
    node.setOverflow(overflowMap[style.overflow]);
  }
  if (style.aspectRatio !== undefined) {
    node.setAspectRatio(style.aspectRatio);
  }

  if (style.position !== undefined) {
    node.setPositionType(
      style.position === "absolute" ? PositionType.Absolute : PositionType.Relative,
    );
  }
  if (style.left !== undefined) {
    node.setPosition(Edge.Left, style.left);
  }
  if (style.top !== undefined) {
    node.setPosition(Edge.Top, style.top);
  }
  if (style.right !== undefined) {
    setYogaLengthPosition(node, Edge.Right, style.right);
  }
  if (style.bottom !== undefined) {
    setYogaLengthPosition(node, Edge.Bottom, style.bottom);
  }
}

/**
 * 将 `ViewStyle.opacity` 规范化为写入布局快照的值：`undefined` 表示省略（读取方当 `1`）。
 */
export function clampOpacityForSnapshot(value: unknown): number | undefined {
  if (value == null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value >= 1) return undefined;
  if (value <= 0) return 0;
  return value;
}
