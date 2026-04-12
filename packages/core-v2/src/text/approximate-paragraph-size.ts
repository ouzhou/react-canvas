/** 无 CanvasKit 时（单测）用于换行与行高的保守估计。 */
export function approximateParagraphSize(
  text: string,
  layoutWidth: number,
  fontSize: number,
  /** 与 {@link ViewStyle.lineHeight} 一致；放大每行占位高度。 */
  lineHeightMultiplier = 1,
): { width: number; height: number } {
  const w = Math.max(1, layoutWidth);
  const charW = fontSize * 0.58;
  const m =
    lineHeightMultiplier > 0 && Number.isFinite(lineHeightMultiplier) ? lineHeightMultiplier : 1;
  const lineHeight = fontSize * 1.28 * m;
  const segments = text.length === 0 ? [""] : text.split("\n");
  let lineCount = 0;
  let maxLineUsed = 0;
  for (const seg of segments) {
    const chars = seg.length === 0 ? 1 : seg.length;
    const wraps = Math.max(1, Math.ceil((chars * charW) / w));
    lineCount += wraps;
    maxLineUsed = Math.max(maxLineUsed, Math.min(w, seg.length * charW || fontSize));
  }
  return {
    width: Math.min(w, maxLineUsed || w),
    height: Math.max(lineHeight, lineCount * lineHeight),
  };
}
