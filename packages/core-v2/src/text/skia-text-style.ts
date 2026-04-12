import type { CanvasKit, DecorationStyle, FontSlant, TextAlign, TextStyle } from "canvaskit-wasm";

import type {
  FontStyleCss,
  TextAlignStyle,
  TextDecorationLineKeyword,
  TextDecorationStyleCss,
} from "../layout/style-map.ts";
import { colorStringToCkColor } from "./css-color.ts";
import { clampLineHeightMultiplier, type MergedTextRunStyle } from "./text-flat-run.ts";

function mapFontWeight(ck: CanvasKit, w: MergedTextRunStyle["fontWeight"]) {
  if (w === "bold" || w === 700) return ck.FontWeight.Bold;
  if (typeof w === "number" && w >= 600) return ck.FontWeight.Bold;
  return ck.FontWeight.Normal;
}

function mapFontSlant(ck: CanvasKit, fontStyle: FontStyleCss | undefined): FontSlant {
  if (fontStyle === "italic" || fontStyle === "oblique") return ck.FontSlant.Italic;
  return ck.FontSlant.Upright;
}

function mapDecorationStyle(ck: CanvasKit, s: TextDecorationStyleCss | undefined): DecorationStyle {
  switch (s) {
    case "double":
      return ck.DecorationStyle.Double;
    case "dotted":
      return ck.DecorationStyle.Dotted;
    case "dashed":
      return ck.DecorationStyle.Dashed;
    case "wavy":
      return ck.DecorationStyle.Wavy;
    case "solid":
    default:
      return ck.DecorationStyle.Solid;
  }
}

function combineDecorations(ck: CanvasKit, lines: readonly TextDecorationLineKeyword[]): number {
  if (lines.length === 0) return ck.NoDecoration;
  let d = ck.NoDecoration;
  for (const line of lines) {
    if (line === "underline") d |= ck.UnderlineDecoration;
    else if (line === "overline") d |= ck.OverlineDecoration;
    else if (line === "line-through") d |= ck.LineThroughDecoration;
  }
  return d;
}

/** Skia `ParagraphStyle.textAlign`。 */
export function mapParagraphTextAlign(ck: CanvasKit, align: TextAlignStyle | undefined): TextAlign {
  switch (align) {
    case "right":
      return ck.TextAlign.Right;
    case "center":
      return ck.TextAlign.Center;
    case "justify":
      return ck.TextAlign.Justify;
    case "start":
      return ck.TextAlign.Start;
    case "end":
      return ck.TextAlign.End;
    case "left":
    default:
      return ck.TextAlign.Left;
  }
}

/** 合并后的 run 样式 → CanvasKit `TextStyle`（不含 `halfLeading` 自定义，沿用 Skia 默认语义）。 */
export function mergedRunStyleToCkTextStyle(ck: CanvasKit, m: MergedTextRunStyle): TextStyle {
  const foreground = colorStringToCkColor(ck, m.color);
  const decorationColorSrc =
    typeof m.textDecorationColor === "string" && m.textDecorationColor.length > 0
      ? m.textDecorationColor
      : m.color;
  const decorationColor = colorStringToCkColor(ck, decorationColorSrc);
  const families = m.fontFamilies.length > 0 ? [...m.fontFamilies] : ["sans-serif"];
  return {
    color: foreground,
    decoration: combineDecorations(ck, m.textDecorationLines),
    decorationColor,
    decorationStyle: mapDecorationStyle(ck, m.textDecorationStyle),
    decorationThickness: m.textDecorationThickness,
    fontSize: m.fontSize,
    fontFamilies: families,
    fontStyle: {
      weight: mapFontWeight(ck, m.fontWeight),
      width: ck.FontWidth.Normal,
      slant: mapFontSlant(ck, m.fontStyle),
    },
    heightMultiplier: clampLineHeightMultiplier(m.lineHeight),
    halfLeading: false,
    letterSpacing: m.letterSpacing,
    wordSpacing: m.wordSpacing,
  };
}
