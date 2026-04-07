export type ViewportState = {
  translateX: number;
  translateY: number;
  scale: number;
};

export const DEFAULT_VIEWPORT: ViewportState = {
  translateX: 0,
  translateY: 0,
  scale: 1,
};

export function clampViewportScale(scale: number, min = 0.1, max = 8): number {
  return Math.min(max, Math.max(min, scale));
}

/**
 * 以 (fx, fy) 为焦点，乘以 factor，更新平移使焦点在场景坐标系下相对画布逻辑像素的位置关系与缩放一致。
 */
export function zoomAtViewportPoint(
  state: ViewportState,
  factor: number,
  fx: number,
  fy: number,
  minScale = 0.1,
  maxScale = 8,
): ViewportState {
  const s0 = state.scale;
  const s1 = clampViewportScale(s0 * factor, minScale, maxScale);
  if (s1 === s0) return state;
  const r = s1 / s0;
  return {
    scale: s1,
    translateX: fx - r * (fx - state.translateX),
    translateY: fy - r * (fy - state.translateY),
  };
}

export function panViewport(state: ViewportState, dx: number, dy: number): ViewportState {
  return {
    ...state,
    translateX: state.translateX + dx,
    translateY: state.translateY + dy,
  };
}
