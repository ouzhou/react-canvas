import type { ViewStyle } from "@react-canvas/react-v2";

/** 与 core-v2 默认彩虹色带一致（须用 `#rrggbb`，勿用 `hsl()`——CanvasKit 解析失败会变黑）。 */
export const SMOKE_REPO_RAINBOW_COLORS: readonly string[] = [
  "#fb7185",
  "#fbbf24",
  "#a3e635",
  "#34d399",
  "#60a5fa",
  "#a78bfa",
  "#e879f9",
  "#fb7185",
];

export const SMOKE_REPO_RAINBOW_LAYER_ID = "smoke-sidebar-repo-rainbow";

/** 静态线性彩虹一层（原始渐变方向），无动画、无 `patchStyle`。 */
export const SMOKE_REPO_RAINBOW_LAYER_STYLE: ViewStyle = {
  position: "absolute",
  left: 0,
  top: 0,
  right: 0,
  bottom: 0,
  pointerEvents: "none",
  backgroundColor: "#cbd5e1",
  backgroundLinearGradient: { angleRad: 0, colors: SMOKE_REPO_RAINBOW_COLORS },
};
