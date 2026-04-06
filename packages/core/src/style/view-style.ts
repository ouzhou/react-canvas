/**
 * Subset of RN/Web flex style keys supported in phase 1.
 * Values are numbers (points), percentage strings, or enumerated strings.
 */
export type DimensionValue = number | "auto" | `${number}%`;

/** 与 `render/transform.ts` 中 `TransformStyle` 一致；此处单独声明避免 style ↔ render 循环依赖。 */
export type TransformStyle = {
  perspective?: number;
  translateX?: number;
  translateY?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: string;
  rotateZ?: string;
  skewX?: string;
  skewY?: string;
};

export type ViewStyle = {
  width?: DimensionValue;
  height?: DimensionValue;
  minWidth?: DimensionValue;
  maxWidth?: DimensionValue;
  minHeight?: DimensionValue;
  maxHeight?: DimensionValue;
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: DimensionValue;
  flexDirection?: "row" | "row-reverse" | "column" | "column-reverse";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  justifyContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "space-between"
    | "space-around"
    | "space-evenly";
  alignItems?: "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  alignSelf?: "auto" | "flex-start" | "center" | "flex-end" | "stretch" | "baseline";
  alignContent?:
    | "flex-start"
    | "center"
    | "flex-end"
    | "stretch"
    | "space-between"
    | "space-around"
    | "space-evenly";
  margin?: number | "auto" | `${number}%`;
  marginLeft?: number | "auto" | `${number}%`;
  marginRight?: number | "auto" | `${number}%`;
  marginTop?: number | "auto" | `${number}%`;
  marginBottom?: number | "auto" | `${number}%`;
  marginHorizontal?: number | "auto" | `${number}%`;
  marginVertical?: number | "auto" | `${number}%`;
  padding?: number | `${number}%`;
  paddingLeft?: number | `${number}%`;
  paddingRight?: number | `${number}%`;
  paddingTop?: number | `${number}%`;
  paddingBottom?: number | `${number}%`;
  paddingHorizontal?: number | `${number}%`;
  paddingVertical?: number | `${number}%`;
  gap?: number | `${number}%`;
  rowGap?: number | `${number}%`;
  columnGap?: number | `${number}%`;
  position?: "relative" | "absolute";
  top?: DimensionValue;
  right?: DimensionValue;
  bottom?: DimensionValue;
  left?: DimensionValue;
  display?: "flex" | "none";
  aspectRatio?: number;
  backgroundColor?: string;
  /**
   * `hidden`：子节点按本盒与 `borderRadius` 裁剪（Skia `clipRRect` / `clipRect`），与 RN `overflow: hidden` + 圆角一致。
   * 未设置或 `visible`：不裁剪子绘制（默认）。
   */
  overflow?: "visible" | "hidden";
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number;
  /** 悬停时由指针管线同步到 `<canvas>` 的 `style.cursor`（如 `pointer`、`default`）。 */
  cursor?: string;
  /** RN 风格变换；不驱动 Yoga，仅影响绘制与命中（见 Step 12-0）。 */
  transform?: TransformStyle[];
  /**
   * 仅影响**同一父节点下**子节点的绘制与命中顺序（不改变 Yoga 子节点顺序）。
   * 数值越大越在上层；未设置视为 `0`。
   */
  zIndex?: number;
};
