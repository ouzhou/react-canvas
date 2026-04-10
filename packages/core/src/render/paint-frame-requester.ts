const paintFrameRequesters = new Set<() => void>();

/**
 * 注册「下一帧需要重绘」的回调。多画布时允许多个回调并存；解码完成时 {@link requestRedrawFromImage} 会依次调用。
 * 传入 `null` 会清空全部（仅测试或整站卸载时使用）。
 *
 * 与 {@link requestRedrawFromImage} 仍为进程级广播；宿主侧每个 `<canvas>` 应注册自己的
 * `queueLayoutPaintFrame` 闭包。后续与 {@link Stage} 绑定的 per-surface 注册可在不破坏
 * `ImageNode` 解码路径的前提下演进。
 */
export function registerPaintFrameRequester(fn: (() => void) | null): void {
  if (fn === null) {
    paintFrameRequesters.clear();
    return;
  }
  paintFrameRequesters.add(fn);
}

export function unregisterPaintFrameRequester(fn: () => void): void {
  paintFrameRequesters.delete(fn);
}

/** Called when async image decode completes so the next frame repaints. */
export function requestRedrawFromImage(): void {
  for (const f of paintFrameRequesters) {
    f();
  }
}
