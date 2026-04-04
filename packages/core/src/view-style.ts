/**
 * Subset of RN/Web flex style keys supported in phase 1.
 * Values are numbers (points), percentage strings, or enumerated strings.
 */
export type DimensionValue = number | "auto" | `${number}%`;

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
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number;
};
