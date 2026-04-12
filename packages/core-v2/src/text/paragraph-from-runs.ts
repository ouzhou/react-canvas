import type { Canvas, CanvasKit } from "canvaskit-wasm";
import type { TypefaceFontProvider } from "canvaskit-wasm";

import type { ViewStyle } from "../layout/style-map.ts";
import { approximateParagraphSize } from "./approximate-paragraph-size.ts";
import { getParagraphMeasureContext } from "../layout/paragraph-measure-context.ts";
import { mapParagraphTextAlign, mergedRunStyleToCkTextStyle } from "./skia-text-style.ts";
import {
  joinTextFlatRuns,
  maxMergedFontSize,
  maxMergedLineHeight,
  mergeTextRunStyle,
  type TextFlatRun,
} from "./text-flat-run.ts";

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
  const baseTs = mergedRunStyleToCkTextStyle(ck, first);
  const paraStyle = new ck.ParagraphStyle({
    textAlign: mapParagraphTextAlign(ck, boxStyle?.textAlign),
    textStyle: baseTs,
  });
  const builder = ck.ParagraphBuilder.MakeFromFontProvider(paraStyle, fontProvider);
  for (const run of runs) {
    const m = mergeTextRunStyle(run, boxStyle, defaultFamily);
    builder.pushStyle(mergedRunStyleToCkTextStyle(ck, m));
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
  const baseTs = mergedRunStyleToCkTextStyle(ck, first);
  const paraStyle = new ck.ParagraphStyle({
    textAlign: mapParagraphTextAlign(ck, boxStyle?.textAlign),
    textStyle: baseTs,
  });
  const builder = ck.ParagraphBuilder.MakeFromFontProvider(paraStyle, fontProvider);
  for (const run of runs) {
    const m = mergeTextRunStyle(run, boxStyle, defaultParagraphFontFamily);
    builder.pushStyle(mergedRunStyleToCkTextStyle(ck, m));
    builder.addText(run.text);
  }
  const paragraph = builder.build();
  paragraph.layout(Math.max(1, layoutWidth));
  skCanvas.drawParagraph(paragraph, x, y);
  paragraph.delete();
  builder.delete();
}
