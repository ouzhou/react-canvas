/** 各示例画布尺寸（core / react 共用，保证像素一致） */
export const DEMO_LAYOUT = { w: 400, h: 300 } as const;
export const DEMO_POINTER = { w: 400, h: 300 } as const;
export const DEMO_THROUGH = { w: 400, h: 300 } as const;
export const DEMO_HOVER = { w: 200, h: 200 } as const;
/** cursor 多场景：静态 / 父链 / hover 联动 / 穿透 / 拖拽抓手（与行高之和 + padding 对齐） */
export const DEMO_CURSOR = { w: 400, h: 418 } as const;
export const DEMO_MODAL = { w: 400, h: 300 } as const;
/** CanvasKit Paragraph：双段文字 + 多 run；灰条最大宽 = 画布宽 − 左右 padding */
export const DEMO_TEXT = { w: 420, h: 400 } as const;
/** ViewStyle 扩展：margin / gap / padding 单边 / wrap / flex 分项 */
export const DEMO_STYLE = { w: 420, h: 340 } as const;
export const TEXT_DEMO_WRAP_MIN = 80;
export const TEXT_DEMO_WRAP_MAX = DEMO_TEXT.w - 32;
