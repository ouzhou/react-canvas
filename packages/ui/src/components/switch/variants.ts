import type { ViewStyle } from "@react-canvas/core";
import type { CanvasToken } from "../../theme/types.ts";

export type SwitchSize = "sm" | "md";

export function getSwitchMetrics(size: SwitchSize): {
  trackW: number;
  trackH: number;
  thumb: number;
  pad: number;
} {
  if (size === "sm") {
    return { trackW: 36, trackH: 20, thumb: 14, pad: 3 };
  }
  return { trackW: 44, trackH: 24, thumb: 18, pad: 3 };
}

export function getSwitchTrackStyle(
  size: SwitchSize,
  token: CanvasToken,
  checked: boolean,
): ViewStyle {
  const { trackW, trackH } = getSwitchMetrics(size);
  return {
    width: trackW,
    height: trackH,
    borderRadius: trackH / 2,
    padding: getSwitchMetrics(size).pad,
    backgroundColor: checked ? token.colorPrimary : token.colorBorder,
  };
}

export function getSwitchThumbOffset(size: SwitchSize, checked: boolean): number {
  const { trackW, thumb, pad } = getSwitchMetrics(size);
  const maxOffset = trackW - pad * 2 - thumb;
  return checked ? maxOffset : 0;
}

export function getSwitchThumbStyle(size: SwitchSize): ViewStyle {
  const { thumb } = getSwitchMetrics(size);
  return {
    width: thumb,
    height: thumb,
    borderRadius: thumb / 2,
    backgroundColor: "#ffffff",
  };
}
