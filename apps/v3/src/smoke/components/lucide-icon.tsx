import { SvgPath, View } from "@react-canvas/react-v2";
import type { ReactNode } from "react";
import { useMemo } from "react";

import {
  iconNodeToPathPayloads,
  mergePathDs,
  type LucideIconTuple,
  type LucideIconData,
} from "../lib/lucide-icon-to-d.ts";

type LucideIconInput = LucideIconData | readonly LucideIconTuple[];

function isLucideIconData(input: LucideIconInput): input is LucideIconData {
  return !Array.isArray(input);
}

function toLucideIconData(input: LucideIconInput): LucideIconData {
  if (isLucideIconData(input)) {
    return input;
  }
  return { name: "lucide", node: input };
}

export function LucideIcon(props: {
  icon?: LucideIconInput;
  svg?: LucideIconInput;
  size?: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  viewBox?: string;
  onError?: (error: unknown) => void;
}): ReactNode {
  const {
    icon,
    svg,
    size,
    color = "#0f172a",
    stroke,
    strokeWidth = 2,
    fill = "none",
    viewBox = "0 0 24 24",
    onError,
  } = props;
  const iconInput = icon ?? svg;
  const iconData = iconInput ? toLucideIconData(iconInput) : null;
  const resolvedSize = size ?? iconData?.size ?? 24;
  const d = useMemo(() => {
    if (!iconData) {
      return "";
    }
    return mergePathDs(iconNodeToPathPayloads(iconData));
  }, [iconData]);
  const strokeColor = stroke ?? color;

  if (!iconData) {
    onError?.(new Error("LucideIcon: `icon` or `svg` is required."));
    return <View style={{ width: resolvedSize, height: resolvedSize }} />;
  }

  if (!d) {
    onError?.(new Error("LucideIcon: icon.node produced no drawable path."));
    return <View style={{ width: resolvedSize, height: resolvedSize }} />;
  }

  return (
    <SvgPath
      d={d}
      viewBox={viewBox}
      stroke={strokeColor}
      fill={fill}
      strokeWidth={strokeWidth}
      style={{ width: resolvedSize, height: resolvedSize }}
      onError={onError}
    />
  );
}
