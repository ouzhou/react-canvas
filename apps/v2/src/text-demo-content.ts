import type { TextFlatRun } from "@react-canvas/core-v2";

/** 与 React / Core 两侧主段落换行段一致（中长混合文）。 */
export const TEXT_DEMO_LONG_WRAP =
  "你好 react-canvas · Hello paragraph demo。重复中文与 English mixed content，用于自动折行与测量。".repeat(
    2,
  );

/** 顶栏说明：小号字 + color，与主段同宽。 */
export const TEXT_DEMO_CAPTION =
  "【Caption】小号灰条 lineHeight≈1.38；与主段同宽随滑块变宽。主段外层≈1.82，并含嵌套 run 更高行距。覆盖 M3、硬换行与自动换行。";

/** 与 React `<Text id="text-caption">` 经 `collectTextRuns` 后的单 run 一致（含显式 lineHeight）。 */
export function textDemoCaptionFlatRuns(): TextFlatRun[] {
  return [{ text: TEXT_DEMO_CAPTION, fontSize: 12, color: "#64748b", lineHeight: 1.38 }];
}

const BODY_LH = 1.82;

/**
 * 与 React `TextDemoScene` 主段 `collectTextRuns` 的切分一致：外层句段 flush、嵌套各一段、
 * 尾部「。自动换行段」+ 换行 + 长段 + 换行 + 收尾为**同一 run**（避免 Skia 多 run 边界与 React 行高不一致）。
 */
export function textDemoBodyFlatRuns(): TextFlatRun[] {
  const tail = `。自动换行段：\n${TEXT_DEMO_LONG_WRAP}\n── 硬换行收尾：拖窄灰条主段应自动增高。`;
  return [
    { text: "M3：外层 15px 字色继承；整段 lineHeight≈1.82。嵌套 ", lineHeight: BODY_LH },
    { text: "粗体红", fontWeight: "bold", color: "#b91c1c", lineHeight: BODY_LH },
    { text: " 与 ", lineHeight: BODY_LH },
    { text: "18px 蓝", fontSize: 18, color: "#0369a1", lineHeight: BODY_LH },
    { text: " 与 局部行距↑2.45", lineHeight: 2.45, color: "#7c3aed" },
    { text: tail, lineHeight: BODY_LH },
  ];
}
