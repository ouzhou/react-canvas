import type { CanvasKit, Color } from "canvaskit-wasm";

import { parseCssHexColor } from "./css-hex.ts";

/**
 * 将 CSS 颜色字符串转为 CanvasKit `Color`（RGBA 浮点）。
 * 优先 `CanvasKit.parseColorString`，失败时回退到 `#rgb` / `#rrggbb`。
 */
export function colorStringToCkColor(ck: CanvasKit, s: string): Color {
  const t = s.trim();
  if (t.length === 0) return ck.Color(17, 24, 39, 1);
  if (/^transparent$/i.test(t)) return ck.Color(0, 0, 0, 0);
  try {
    const parsed = ck.parseColorString(t);
    if (parsed && parsed.length >= 4) return parsed;
  } catch {
    // parseColorString 对部分非法串可能抛错
  }
  const hex = parseCssHexColor(t);
  if (hex) return ck.Color(hex.r, hex.g, hex.b, 1);
  return ck.Color(17, 24, 39, 1);
}
