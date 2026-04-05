import type { ViewStyle } from "./view-style.ts";

/**
 * Text-only style keys (M2). Other RN Text props (e.g. `letterSpacing`, `textDecorationLine`) are
 * intentionally omitted until implemented — do not assume RN parity beyond this set.
 */
export type TextOnlyProps = {
  /** Logical pixels; default comes from Skia when omitted. */
  fontSize?: number;
  /**
   * CSS-like `font-family` list (comma-separated). Order is fallback for Skia Paragraph.
   * On CanvasKit Web, only names that match **registered** fonts resolve; by default
   * `initCanvasRuntime` registers a built-in Noto Sans SC subset unless opted out.
   */
  fontFamily?: string;
  /** CSS color string, e.g. `#333` or `rgb()` — parsed via CanvasKit in paint/measure. */
  color?: string;
  /** Subset aligned with common RN values; maps to Skia font weight where possible. */
  fontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";
  textAlign?: "left" | "center" | "right";
  /**
   * Line height: **unitless** multiplier in ~0.5–4 (CSS-style, e.g. `1.45`), or **absolute** logical px
   * (larger values, RN-style); mapped to Skia `heightMultiplier`.
   */
  lineHeight?: number;
  numberOfLines?: number;
  ellipsizeMode?: "tail";
};

/** Layout + visual keys from `ViewStyle`, plus M2 text keys. */
export type TextStyle = ViewStyle & TextOnlyProps;

const TEXT_ONLY_KEYS = new Set<string>([
  "fontSize",
  "fontFamily",
  "color",
  "fontWeight",
  "textAlign",
  "lineHeight",
  "numberOfLines",
  "ellipsizeMode",
]);

/** Merge nested `<Text>` styles (child overrides parent for overlapping keys). */
export function mergeTextProps(base: TextOnlyProps, override: TextOnlyProps): TextOnlyProps {
  return { ...base, ...override };
}

/**
 * Split a `Text` style into Yoga/layout/visual (`ViewStyle`) vs Skia Paragraph (`TextOnlyProps`).
 */

export function splitTextStyle(style: TextStyle): { layout: ViewStyle; text: TextOnlyProps } {
  const layout: ViewStyle = {};
  const text: TextOnlyProps = {};
  for (const [k, val] of Object.entries(style)) {
    if (val === undefined) continue;
    if (TEXT_ONLY_KEYS.has(k)) {
      (text as Record<string, unknown>)[k] = val;
    } else {
      (layout as Record<string, unknown>)[k] = val;
    }
  }
  return { layout, text };
}
