import type {
  FontStyleCss,
  TextDecorationLineKeyword,
  TextDecorationLineStyle,
  TextDecorationStyleCss,
  TextRunStylePatch,
  ViewStyle,
} from "../layout/style-map.ts";
import { splitCssFontFamilyList } from "./css-font-families.ts";

/**
 * 扁平化后的文本片段（M3）；与外层 `insertText` 的 `ViewStyle` 做字段级合并后用于 Paragraph。
 */
export type TextFlatRun = { text: string } & Partial<TextRunStylePatch>;

const DEFAULT_TEXT_COLOR = "#111827";

export type MergedTextRunStyle = {
  color: string;
  fontSize: number;
  /** 主族名（`fontFamilies[0]`），便于调试与兼容旧逻辑。 */
  fontFamily: string;
  fontFamilies: readonly string[];
  fontWeight: "normal" | "bold" | number;
  /** Skia `heightMultiplier` 源倍率，默认 1；绘制时再经 {@link clampLineHeightMultiplier}。 */
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  fontStyle: FontStyleCss;
  textDecorationLines: readonly TextDecorationLineKeyword[];
  textDecorationStyle: TextDecorationStyleCss;
  textDecorationThickness: number;
  /** 非空则用作装饰线颜色；否则绘制层使用与 `color` 相同。 */
  textDecorationColor?: string;
};

export function normalizeTextDecorationLines(
  v: TextDecorationLineStyle | undefined,
): readonly TextDecorationLineKeyword[] {
  if (v === undefined || v === "none") return [];
  if (Array.isArray(v)) return v;
  if (v === "underline" || v === "overline" || v === "line-through") return [v];
  return [];
}

function resolveFontFamilies(
  run: TextFlatRun,
  box: ViewStyle | undefined,
  defaultFontFamily: string,
): string[] {
  if (run.fontFamilies !== undefined && run.fontFamilies.length > 0) {
    return [...run.fontFamilies];
  }
  if (box?.fontFamilies !== undefined && box.fontFamilies.length > 0) {
    return [...box.fontFamilies];
  }
  const raw =
    typeof run.fontFamily === "string" && run.fontFamily.trim().length > 0
      ? run.fontFamily
      : typeof box?.fontFamily === "string" && box.fontFamily.trim().length > 0
        ? box.fontFamily
        : defaultFontFamily;
  const parts = splitCssFontFamilyList(raw);
  return parts.length > 0 ? parts : [defaultFontFamily];
}

export function joinTextFlatRuns(runs: readonly TextFlatRun[]): string {
  return runs.map((r) => r.text).join("");
}

export function mergeTextRunStyle(
  run: TextFlatRun,
  box: ViewStyle | undefined,
  defaultFontFamily: string,
): MergedTextRunStyle {
  const fontSize =
    typeof run.fontSize === "number" && run.fontSize > 0
      ? run.fontSize
      : typeof box?.fontSize === "number" && box.fontSize > 0
        ? box.fontSize
        : 16;
  const color =
    typeof run.color === "string" && run.color.length > 0
      ? run.color
      : typeof box?.color === "string" && box.color.length > 0
        ? box.color
        : DEFAULT_TEXT_COLOR;
  const fontFamilies = resolveFontFamilies(run, box, defaultFontFamily);
  const fontFamily = fontFamilies[0] ?? defaultFontFamily;
  const fontWeight = run.fontWeight ?? box?.fontWeight ?? "normal";
  const lineHeight =
    typeof run.lineHeight === "number" && run.lineHeight > 0
      ? run.lineHeight
      : typeof box?.lineHeight === "number" && box.lineHeight > 0
        ? box.lineHeight
        : 1;
  const letterSpacing =
    typeof run.letterSpacing === "number" && Number.isFinite(run.letterSpacing)
      ? run.letterSpacing
      : typeof box?.letterSpacing === "number" && Number.isFinite(box.letterSpacing)
        ? box.letterSpacing
        : 0;
  const wordSpacing =
    typeof run.wordSpacing === "number" && Number.isFinite(run.wordSpacing)
      ? run.wordSpacing
      : typeof box?.wordSpacing === "number" && Number.isFinite(box.wordSpacing)
        ? box.wordSpacing
        : 0;
  const fontStyle: FontStyleCss = run.fontStyle ?? box?.fontStyle ?? "normal";
  const textDecorationLines = normalizeTextDecorationLines(
    run.textDecorationLine ?? box?.textDecorationLine,
  );
  const textDecorationStyle: TextDecorationStyleCss =
    run.textDecorationStyle ?? box?.textDecorationStyle ?? "solid";
  const textDecorationThicknessRaw =
    run.textDecorationThickness ?? box?.textDecorationThickness ?? 1;
  const textDecorationThickness =
    typeof textDecorationThicknessRaw === "number" &&
    Number.isFinite(textDecorationThicknessRaw) &&
    textDecorationThicknessRaw > 0
      ? textDecorationThicknessRaw
      : 1;
  const decoFromRun =
    typeof run.textDecorationColor === "string" && run.textDecorationColor.trim().length > 0;
  const decoFromBox =
    typeof box?.textDecorationColor === "string" && box.textDecorationColor.trim().length > 0;
  const textDecorationColor = decoFromRun
    ? run.textDecorationColor!.trim()
    : decoFromBox
      ? box!.textDecorationColor!.trim()
      : undefined;

  return {
    color,
    fontSize,
    fontFamily,
    fontFamilies,
    fontWeight,
    lineHeight,
    letterSpacing,
    wordSpacing,
    fontStyle,
    textDecorationLines,
    textDecorationStyle,
    textDecorationThickness,
    textDecorationColor,
  };
}

/** 纯字符串文本节点：用空 run 与外层 `ViewStyle` 合并。 */
export function mergePlainTextStyle(
  box: ViewStyle | undefined,
  defaultFontFamily: string,
): MergedTextRunStyle {
  return mergeTextRunStyle({ text: "" }, box, defaultFontFamily);
}

export function maxMergedFontSize(
  runs: readonly TextFlatRun[],
  box: ViewStyle | undefined,
  defaultFontFamily: string,
): number {
  let m = 0;
  for (const r of runs) {
    m = Math.max(m, mergeTextRunStyle(r, box, defaultFontFamily).fontSize);
  }
  return m > 0 ? m : 16;
}

/** 多 run 段落近似测量用：取各 run 合并后的最大行距倍率。 */
export function maxMergedLineHeight(
  runs: readonly TextFlatRun[],
  box: ViewStyle | undefined,
  defaultFontFamily: string,
): number {
  let m = 1;
  for (const r of runs) {
    m = Math.max(m, mergeTextRunStyle(r, box, defaultFontFamily).lineHeight);
  }
  return m;
}

/** 将样式中的行距倍率钳到 Skia 可接受范围。 */
export function clampLineHeightMultiplier(n: number | undefined): number {
  if (n === undefined || !Number.isFinite(n) || n <= 0) return 1;
  return Math.min(4, Math.max(0.25, n));
}
