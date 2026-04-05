import type { CanvasToken, SeedToken } from "./types.ts";

export function defaultAlgorithm(seed: SeedToken): CanvasToken {
  return {
    colorPrimary: seed.colorPrimary,
    colorBgLayout: "#f5f5f5",
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
  return {
    colorBgLayout: "#141414",
    colorText: "rgba(255,255,255,0.9)",
    colorBorder: "#424242",
    colorPrimary: token.colorPrimary,
  };
}
