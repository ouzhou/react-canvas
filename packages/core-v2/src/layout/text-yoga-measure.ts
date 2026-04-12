import type { MeasureFunction } from "yoga-layout/load";
import { MeasureMode } from "yoga-layout/load";
import type { Yoga } from "yoga-layout/load";
import type { TextStyle } from "canvaskit-wasm";

import type { NodeStore } from "../runtime/node-store.ts";
import type { ViewStyle } from "./style-map.ts";
import { getParagraphMeasureContext } from "./paragraph-measure-context.ts";
import { approximateParagraphSize } from "../text/approximate-paragraph-size.ts";
import { measureParagraphFromRuns } from "../text/paragraph-from-runs.ts";
import { clampLineHeightMultiplier } from "../text/text-flat-run.ts";

export { approximateParagraphSize } from "../text/approximate-paragraph-size.ts";

const DEFAULT_FONT_SIZE = 16;

function measureWithCanvasKit(
  text: string,
  layoutWidth: number,
  fontSize: number,
  lineHeight?: number,
): { width: number; height: number } {
  const c = getParagraphMeasureContext();
  if (!c || layoutWidth <= 0) {
    const mult = clampLineHeightMultiplier(lineHeight);
    return approximateParagraphSize(text, layoutWidth, fontSize, mult);
  }
  const { ck, fontFamily, fontProvider } = c;
  const textStyle: TextStyle = {
    color: ck.BLACK,
    decoration: ck.NoDecoration,
    decorationStyle: ck.DecorationStyle.Solid,
    decorationThickness: 1,
    fontSize,
    fontFamilies: [fontFamily],
    fontStyle: {
      weight: ck.FontWeight.Normal,
      width: ck.FontWidth.Normal,
      slant: ck.FontSlant.Upright,
    },
    heightMultiplier: clampLineHeightMultiplier(lineHeight),
    halfLeading: false,
    letterSpacing: 0,
    wordSpacing: 0,
  };
  const paraStyle = new ck.ParagraphStyle({
    textAlign: ck.TextAlign.Left,
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
  return { width: outW, height: Math.max(fontSize, h) };
}

function fontSizeFromStyle(style: ViewStyle | undefined): number {
  const n = style?.fontSize;
  return typeof n === "number" && n > 0 ? n : DEFAULT_FONT_SIZE;
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
    const { width: innerW, height: innerH } =
      runs && runs.length > 0
        ? measureParagraphFromRuns(runs, n.viewStyle, layoutW)
        : measureWithCanvasKit(
            n.textContent,
            layoutW,
            fontSizeFromStyle(n.viewStyle),
            n.viewStyle?.lineHeight,
          );
    const outW = resolveMeasuredWidth(width, widthMode, innerW);
    const outH = resolveMeasuredHeight(height, heightMode, innerH);
    return { width: outW, height: outH };
  };

  node.yogaNode.setMeasureFunc(measure);
}
