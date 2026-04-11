/** 各示例画布尺寸（core / react 共用，保证像素一致） */
export const DEMO_LAYOUT = { w: 400, h: 300 } as const;
export const DEMO_POINTER = { w: 400, h: 300 } as const;
export const DEMO_THROUGH = { w: 400, h: 300 } as const;
export const DEMO_HOVER = { w: 200, h: 200 } as const;
/** cursor 多场景：静态 / 父链 / hover 联动 / 穿透 / 拖拽抓手（与行高之和 + padding 对齐） */
export const DEMO_CURSOR = { w: 400, h: 418 } as const;
