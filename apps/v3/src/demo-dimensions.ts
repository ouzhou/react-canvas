/** 各示例画布尺寸（core / react 共用，保证像素一致） */
export const DEMO_LAYOUT = { w: 400, h: 440 } as const;
export const DEMO_POINTER = { w: 400, h: 440 } as const;
export const DEMO_THROUGH = { w: 400, h: 360 } as const;
export const DEMO_HOVER = { w: 220, h: 340 } as const;
/** cursor：多段说明 + 静态 / 父链 / hover / 穿透 / 拖拽（示例五含说明行） */
export const DEMO_CURSOR = { w: 400, h: 560 } as const;
export const DEMO_MODAL = { w: 400, h: 300 } as const;
/** CanvasKit Paragraph：双段文字 + 多 run；灰条最大宽 = 画布宽 − 左右 padding */
/** 含 Caption / 主段 + Skia 文本样式可视化多行。 */
export const DEMO_TEXT = { w: 420, h: 700 } as const;
/** ViewStyle 扩展：margin / gap / padding 单边 / wrap / flex 分项 */
export const DEMO_STYLE = { w: 420, h: 340 } as const;
/** borderWidth / borderColor + borderRadius 与内区挤压示意 */
export const DEMO_BORDER = { w: 400, h: 420 } as const;
/** Image + SvgPath（Lucide） */
export const DEMO_MEDIA = { w: 440, h: 420 } as const;
export const TEXT_DEMO_WRAP_MIN = 80;
export const TEXT_DEMO_WRAP_MAX = DEMO_TEXT.w - 32;
