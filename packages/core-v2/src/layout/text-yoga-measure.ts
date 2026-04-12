import type { MeasureFunction } from "yoga-layout/load";
import { MeasureMode } from "yoga-layout/load";
import type { Yoga } from "yoga-layout/load";

import type { NodeStore } from "../runtime/node-store.ts";
import type { ViewStyle } from "./style-map.ts";
import { getParagraphMeasureContext } from "./paragraph-measure-context.ts";
import { approximateParagraphSize } from "../text/approximate-paragraph-size.ts";
import { measureParagraphFromRuns } from "../text/paragraph-from-runs.ts";
import { mapParagraphTextAlign, mergedRunStyleToCkTextStyle } from "../text/skia-text-style.ts";
import { clampLineHeightMultiplier, mergePlainTextStyle } from "../text/text-flat-run.ts";

export { approximateParagraphSize } from "../text/approximate-paragraph-size.ts";

function measureWithCanvasKit(
  text: string,
  layoutWidth: number,
  style: ViewStyle | undefined,
  defaultFontFamily: string,
): { width: number; height: number } {
  const c = getParagraphMeasureContext();
  if (!c || layoutWidth <= 0) {
    const mult = clampLineHeightMultiplier(style?.lineHeight);
    const fs = typeof style?.fontSize === "number" && style.fontSize > 0 ? style.fontSize : 16;
    return approximateParagraphSize(text, layoutWidth, fs, mult);
  }
  const { ck, fontProvider } = c;
  const m = mergePlainTextStyle(style, defaultFontFamily);
  const textStyle = mergedRunStyleToCkTextStyle(ck, m);
  const paraStyle = new ck.ParagraphStyle({
    textAlign: mapParagraphTextAlign(ck, style?.textAlign),
    textStyle,
  });
  const builder = ck.ParagraphBuilder.MakeFromFontProvider(paraStyle, fontProvider);
  builder.pushStyle(textStyle);
  builder.addText(text);
  const paragraph = builder.build();
  paragraph.layout(layoutWidth);
  const h = paragraph.getHeight();
  const longest = paragraph.getLongestLine();
  paragraph.delete();
  builder.delete();
  const usedW = Math.min(layoutWidth, Math.max(0, longest));
  const outW = layoutWidth > 0 ? Math.min(layoutWidth, Math.ceil(usedW || layoutWidth)) : 0;
  return { width: outW, height: Math.max(m.fontSize, h) };
}

function resolveLayoutWidth(width: number, widthMode: MeasureMode): number {
  if (widthMode === MeasureMode.Exactly) {
    return Math.max(1, width);
  }
  if (widthMode === MeasureMode.AtMost) {
    return Math.max(1, width);
  }
  return 4096;
}

function resolveMeasuredWidth(width: number, widthMode: MeasureMode, intrinsicW: number): number {
  if (widthMode === MeasureMode.Exactly) {
    return width;
  }
  if (widthMode === MeasureMode.AtMost) {
    return Math.min(width, Math.max(0, intrinsicW));
  }
  return Math.max(0, intrinsicW);
}

function resolveMeasuredHeight(
  height: number,
  heightMode: MeasureMode,
  intrinsicH: number,
): number {
  if (heightMode === MeasureMode.Exactly) {
    return height;
  }
  return Math.max(0, intrinsicH);
}

export function bindTextNodeMeasure(store: NodeStore, _yoga: Yoga, nodeId: string): void {
  const node = store.get(nodeId);
  if (!node || node.kind !== "text") return;

  const style = node.viewStyle;
  if (style?.height !== undefined && typeof style.height === "number") {
    node.yogaNode.unsetMeasureFunc();
    return;
  }

  const measure: MeasureFunction = (width, widthMode, height, heightMode) => {
    const n = store.get(nodeId);
    if (!n || n.kind !== "text" || n.textContent === undefined) {
      return { width: 0, height: 0 };
    }
    const layoutW = resolveLayoutWidth(width, widthMode);
    const runs = n.textRuns;
    const ctx = getParagraphMeasureContext();
    const defaultFf = ctx?.fontFamily ?? "sans-serif";
    const { width: innerW, height: innerH } =
      runs && runs.length > 0
        ? measureParagraphFromRuns(runs, n.viewStyle, layoutW)
        : measureWithCanvasKit(n.textContent, layoutW, n.viewStyle, defaultFf);
    const outW = resolveMeasuredWidth(width, widthMode, innerW);
    const outH = resolveMeasuredHeight(height, heightMode, innerH);
    return { width: outW, height: outH };
  };

  node.yogaNode.setMeasureFunc(measure);
}
