import type { ViewStyle } from "@react-canvas/core";
import { SvgPath, View } from "@react-canvas/react";
import { mergeViewStyles } from "../../style/merge.ts";
import { iconNodeToPathPayloads, mergePathDs } from "./icon-node-to-paths.ts";
import type { IconProps } from "./types.ts";

function resolveSquareDim(style: ViewStyle | undefined, size: number | undefined): number {
  return (
    size ??
    (typeof style?.width === "number" ? style.width : undefined) ??
    (typeof style?.height === "number" ? style.height : undefined) ??
    24
  );
}

export function Icon(props: IconProps) {
  const { icon, size, color, stroke, fill, strokeWidth = 1, style, onError, ...handlers } = props;

  const payloads = iconNodeToPathPayloads(icon);
  const d = mergePathDs(payloads);
  const dim = resolveSquareDim(style, size);

  const mergedStyle = mergeViewStyles(style ?? {}, { width: dim, height: dim });

  const strokeCol = stroke ?? color;
  const fillCol = fill;

  if (payloads.length === 0 || d.length === 0) {
    onError?.(
      new Error(
        "[@react-canvas/ui] Icon: icon.node produced no drawable path (v1 supports path + circle only).",
      ),
    );
    return <View style={mergedStyle} {...handlers} />;
  }

  return (
    <View style={mergedStyle} {...handlers}>
      <SvgPath
        d={d}
        viewBox="0 0 24 24"
        size={dim}
        stroke={strokeCol}
        fill={fillCol}
        strokeWidth={strokeWidth}
        onError={onError}
      />
    </View>
  );
}
