import type { CanvasToken, SeedToken } from "./types.ts";

/**
 * 将 `#rrggbb` 向白色混合，`ratio` ∈ [0,1]（如 `0.15` 表示约 15% 向白）。
 * 无法解析时原样返回。
 */
export function lightenTowardsWhite(hex: string, ratio: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    return hex;
  }
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const blend = (c: number) => Math.round(c + (255 - c) * ratio);
  return `#${blend(r).toString(16).padStart(2, "0")}${blend(g).toString(16).padStart(2, "0")}${blend(b).toString(16).padStart(2, "0")}`;
}

/** 暗色下在种子主色上提亮，避免 primary 按钮与深色背景融在一起。 */
function lightenPrimaryForDark(hex: string): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) {
    return "#5b9fff";
  }
  const bump = (s: string, add: number) =>
    Math.min(255, parseInt(s, 16) + add)
      .toString(16)
      .padStart(2, "0");
  return `#${bump(m[1], 48)}${bump(m[2], 44)}${bump(m[3], 36)}`;
}

export function defaultAlgorithm(seed: SeedToken): CanvasToken {
  return {
    colorPrimary: seed.colorPrimary,
    colorPrimaryHover: lightenTowardsWhite(seed.colorPrimary, 0.15),
    colorBgLayout: "#f5f5f5",
    colorBgHover: "#fafafa",
    colorText: "rgba(0,0,0,0.85)",
    colorBorder: "#d9d9d9",
    borderRadius: seed.borderRadius,
    paddingSM: 8,
    paddingMD: 12,
    fontSizeSM: 12,
    fontSizeMD: 14,
  };
}

export function compactAlgorithm(token: CanvasToken): Partial<CanvasToken> {
  return {
    paddingSM: Math.max(4, Math.round(token.paddingSM * 0.75)),
    paddingMD: Math.max(6, Math.round(token.paddingMD * 0.75)),
    fontSizeSM: Math.max(10, token.fontSizeSM - 1),
    fontSizeMD: Math.max(12, token.fontSizeMD - 1),
  };
}

export function darkAlgorithm(token: CanvasToken): Partial<CanvasToken> {
  const primary = lightenPrimaryForDark(token.colorPrimary);
  return {
    colorBgLayout: "#141414",
    colorBgHover: "#1f1f1f",
    colorText: "rgba(255,255,255,0.9)",
    colorBorder: "#424242",
    colorPrimary: primary,
    colorPrimaryHover: lightenTowardsWhite(primary, 0.1),
  };
}
