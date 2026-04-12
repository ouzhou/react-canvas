/** 解析 `#rgb` / `#rrggbb`；失败返回 `null`。 */
export function parseCssHexColor(s: string): { r: number; g: number; b: number } | null {
  const m = /^#(?:([\da-f]{3})|([\da-f]{6}))$/i.exec(s.trim());
  if (!m) return null;
  const hex = (m[1] ?? m[2])!;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
