/** 侧栏宽度（参考 Ant Design 文档侧栏信息密度） */
export const SIDEBAR_W = 232;

/** Ant Design 5 文档常用色 */
export const AD_COLOR_PRIMARY = "#1677ff";
export const AD_NAV_BG_HOVER = "#f5f5f5";
export const AD_NAV_BG_SELECTED = "#e6f4ff";
export const AD_SPLIT = "#f0f0f0";
export const AD_TEXT = "rgba(0,0,0,0.88)";
export const AD_TEXT_SECONDARY = "rgba(0,0,0,0.65)";
export const AD_TEXT_TERTIARY = "rgba(0,0,0,0.45)";

/** 与 {@link IntroDemoScene} 主内容区对齐：顶距、水平内边距、白底 */
export const DEMO_PAGE_MARGIN_TOP = 16;
export const DEMO_PAGE_PADDING_X = 28;
export const DEMO_PAGE_BG = "#ffffff";
/** intro 主列子区块之间的纵向间距 */
export const DEMO_PAGE_SECTION_GAP = 18;

/**
 * 画布宽度 W 下，与 intro 正文列一致的可排版宽度（左右各 {@link DEMO_PAGE_PADDING_X}）。
 * 页面根已设 `padding: DEMO_PAGE_PADDING_X` 时，子区块应使用 `alignSelf: "stretch"` 或本值，避免再套一层更窄的 `Math.min(...)`。
 */
export function demoPageContentWidth(W: number): number {
  return Math.max(0, W - 2 * DEMO_PAGE_PADDING_X);
}

/** 画布演示舞台铺底浅灰（Ant Design 文档主区常用底） */
export const SMOKE_STAGE_BG = "#fafafa";
