/**
 * `viewport` 的 user-scalable/maximum-scale 无法阻止：
 * - 桌面触控板双指缩放（Chrome/Safari 等通过 Ctrl+wheel 实现）
 * - Safari 的 gesture 缩放
 *
 * 在入口尽早调用一次即可。
 */
export function disableBrowserZoomGestures(): void {
  const onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  };
  document.addEventListener("wheel", onWheel, { passive: false });

  const onGesture = (e: Event): void => {
    e.preventDefault();
  };
  document.addEventListener("gesturestart", onGesture, { passive: false });
  document.addEventListener("gesturechange", onGesture, { passive: false });
  document.addEventListener("gestureend", onGesture, { passive: false });

  const onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };
  document.addEventListener("touchmove", onTouchMove, { passive: false });
}
