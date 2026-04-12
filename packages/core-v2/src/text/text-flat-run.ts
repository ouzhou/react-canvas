import type { ViewStyle } from "../layout/style-map.ts";

/**
 * 扁平化后的文本片段（M3）；与外层 `insertText` 的 `ViewStyle` 做字段级合并后用于 Paragraph。
 */
export type TextFlatRun = {
  text: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold" | number;
  /** 与 {@link ViewStyle.lineHeight} 相同语义；可与外层样式合并。 */
  lineHeight?: number;
};

const DEFAULT_TEXT_COLOR = "#111827";

export type MergedTextRunStyle = {
  color: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: "normal" | "bold" | number;
  /** Skia `heightMultiplier`，默认 1。 */
  lineHeight: number;
};

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
  const fontFamily =
    typeof run.fontFamily === "string" && run.fontFamily.length > 0
      ? run.fontFamily
      : typeof box?.fontFamily === "string" && box.fontFamily.length > 0
        ? box.fontFamily
        : defaultFontFamily;
  const fontWeight = run.fontWeight ?? box?.fontWeight ?? "normal";
  const lineHeight =
    typeof run.lineHeight === "number" && run.lineHeight > 0
      ? run.lineHeight
      : typeof box?.lineHeight === "number" && box.lineHeight > 0
        ? box.lineHeight
        : 1;
  return { color, fontSize, fontFamily, fontWeight, lineHeight };
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
