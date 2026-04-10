/**
 * 宿主提供的矩形原点（例如 `getBoundingClientRect()` 的 `left`/`top`），与 `clientX`/`clientY` 同属视口坐标系。
 * 无 DOM 依赖，可在任意环境单测或与 Skia 命中区配合使用。
 */
export type StageViewportOrigin = {
  left: number;
  top: number;
};

/**
 * 将浏览器视口下的指针位置转为 Stage 局部坐标（与 `SceneRuntime` / `dispatchPointerLike` 的 `x`、`y` 一致）。
 */
export function clientXYToStageLocal(
  viewportOrigin: StageViewportOrigin,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return {
    x: clientX - viewportOrigin.left,
    y: clientY - viewportOrigin.top,
  };
}
