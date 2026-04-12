import type { Canvas, CanvasKit, TextStyle } from "canvaskit-wasm";
import type { TypefaceFontProvider } from "canvaskit-wasm";

import type { ViewStyle } from "../layout/style-map.ts";
import { approximateParagraphSize } from "./approximate-paragraph-size.ts";
import { getParagraphMeasureContext } from "../layout/paragraph-measure-context.ts";
import { parseCssHexColor } from "./css-hex.ts";
import {
  clampLineHeightMultiplier,
  joinTextFlatRuns,
  maxMergedFontSize,
  maxMergedLineHeight,
  mergeTextRunStyle,
  type MergedTextRunStyle,
  type TextFlatRun,
} from "./text-flat-run.ts";

function mapFontWeight(ck: CanvasKit, w: MergedTextRunStyle["fontWeight"]) {
  if (w === "bold" || w === 700) return ck.FontWeight.Bold;
  if (typeof w === "number" && w >= 600) return ck.FontWeight.Bold;
  return ck.FontWeight.Normal;
}

function mergedToCkTextStyle(
  ck: CanvasKit,
  m: MergedTextRunStyle,
  defaultParagraphFontFamily: string,
): TextStyle {
  const rgb = parseCssHexColor(m.color) ?? { r: 17, g: 24, b: 39 };
  const families = m.fontFamily.length > 0 ? [m.fontFamily] : [defaultParagraphFontFamily];
  return {
    color: ck.Color(rgb.r, rgb.g, rgb.b, 255),
    decoration: ck.NoDecoration,
    decorationStyle: ck.DecorationStyle.Solid,
    decorationThickness: 1,
    fontSize: m.fontSize,
    fontFamilies: families,
    fontStyle: {
      weight: mapFontWeight(ck, m.fontWeight),
      width: ck.FontWidth.Normal,
      slant: ck.FontSlant.Upright,
    },
    heightMultiplier: clampLineHeightMultiplier(m.lineHeight),
    halfLeading: false,
    letterSpacing: 0,
    wordSpacing: 0,
  };
}

/** 用 CK Paragraph 测量多 run 排版（宽度为 `layoutWidth` 时的高度与宽度）。 */
export function measureParagraphFromRuns(
  runs: readonly TextFlatRun[],
  boxStyle: ViewStyle | undefined,
  layoutWidth: number,
): { width: number; height: number } {
  const c = getParagraphMeasureContext();
  const joined = joinTextFlatRuns(runs);
  const fsMax = maxMergedFontSize(runs, boxStyle, c?.fontFamily ?? "sans-serif");
  if (!c || layoutWidth <= 0) {
    const lhMult = maxMergedLineHeight(runs, boxStyle, "sans-serif");
    return approximateParagraphSize(joined, layoutWidth, fsMax, lhMult);
  }
  const { ck, fontFamily: defaultFamily, fontProvider } = c;
  const first = mergeTextRunStyle(runs[0] ?? { text: "" }, boxStyle, defaultFamily);
  const baseTs = mergedToCkTextStyle(ck, first, defaultFamily);
  const paraStyle = new ck.ParagraphStyle({
    textAlign: ck.TextAlign.Left,
    textStyle: baseTs,
  });
  const builder = ck.ParagraphBuilder.MakeFromFontProvider(paraStyle, fontProvider);
  for (const run of runs) {
    const m = mergeTextRunStyle(run, boxStyle, defaultFamily);
    builder.pushStyle(mergedToCkTextStyle(ck, m, defaultFamily));
    builder.addText(run.text);
  }
  const paragraph = builder.build();
  paragraph.layout(Math.max(1, layoutWidth));
  const h = paragraph.getHeight();
  const longest = paragraph.getLongestLine();
  paragraph.delete();
  builder.delete();
  const usedW = Math.min(layoutWidth, Math.max(0, longest));
  const outW = layoutWidth > 0 ? Math.min(layoutWidth, Math.ceil(usedW || layoutWidth)) : 0;
  return { width: outW, height: Math.max(fsMax, h) };
}

/** Skia presenter：在 `layoutWidth` 下构建 Paragraph 并画到 `(x,y)`。调用方负责 `paragraph.delete()` / `builder.delete()`。 */
export function buildAndDrawParagraphRuns(
  ck: CanvasKit,
  fontProvider: TypefaceFontProvider,
  defaultParagraphFontFamily: string,
  runs: readonly TextFlatRun[],
  boxStyle: ViewStyle | undefined,
  layoutWidth: number,
  skCanvas: Pick<Canvas, "drawParagraph">,
  x: number,
  y: number,
): void {
  const first = mergeTextRunStyle(runs[0] ?? { text: "" }, boxStyle, defaultParagraphFontFamily);
  const baseTs = mergedToCkTextStyle(ck, first, defaultParagraphFontFamily);
  const paraStyle = new ck.ParagraphStyle({
    textAlign: ck.TextAlign.Left,
    textStyle: baseTs,
  });
  const builder = ck.ParagraphBuilder.MakeFromFontProvider(paraStyle, fontProvider);
  for (const run of runs) {
    const m = mergeTextRunStyle(run, boxStyle, defaultParagraphFontFamily);
    builder.pushStyle(mergedToCkTextStyle(ck, m, defaultParagraphFontFamily));
    builder.addText(run.text);
  }
  const paragraph = builder.build();
  paragraph.layout(Math.max(1, layoutWidth));
  skCanvas.drawParagraph(paragraph, x, y);
  paragraph.delete();
  builder.delete();
}
