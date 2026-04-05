import type { ViewStyle } from "@react-canvas/core";
import type { CanvasToken } from "../theme/types.ts";
import { mergeViewStyles } from "./merge.ts";

export type SxCanvas = ViewStyle | ((token: CanvasToken) => ViewStyle) | SxCanvas[] | undefined;

export function resolveSx(token: CanvasToken, sx: SxCanvas): ViewStyle {
  if (sx === undefined) {
    return {};
  }
  if (Array.isArray(sx)) {
    return mergeViewStyles(...sx.map((item) => resolveSx(token, item)));
  }
  if (typeof sx === "function") {
    return sx(token);
  }
  return sx;
}
