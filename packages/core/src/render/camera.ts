import type { CanvasKit } from "canvaskit-wasm";

/**
 * 画布根级视口相机：在 `scale(dpr)` 之后、`paintNode` 之前对 SkCanvas 施加 `T(translate) * S(scale)`（缩放绕原点）。
 * 与 {@link zoomAtViewportPoint} 的代数一致。
 */
export type ViewportCamera = {
  translateX: number;
  translateY: number;
  scale: number;
};

export function isViewportCameraIdentity(cam: ViewportCamera | null | undefined): boolean {
  if (cam == null) return true;
  return cam.scale === 1 && cam.translateX === 0 && cam.translateY === 0;
}

export function buildViewportCameraMatrix(ck: CanvasKit, cam: ViewportCamera): number[] {
  const s = ck.Matrix.scaled(cam.scale, cam.scale, 0, 0);
  const t = ck.Matrix.translated(cam.translateX, cam.translateY);
  return ck.Matrix.multiply(t, s);
}

/**
 * 将画布逻辑坐标（与 `clientToCanvasLogical` / `hitTest` 输入一致）从**施加相机后的屏幕空间**
 * 映射回**场景根布局坐标**（与未施加 `ViewportCamera` 时一致）。
 */
export function logicalPointFromCameraViewport(
  ck: CanvasKit,
  camera: ViewportCamera | null | undefined,
  pageX: number,
  pageY: number,
): { x: number; y: number } {
  if (isViewportCameraIdentity(camera)) {
    return { x: pageX, y: pageY };
  }
  const m = buildViewportCameraMatrix(ck, camera!);
  const inv = ck.Matrix.invert(m);
  if (!inv) return { x: pageX, y: pageY };
  const pts = [pageX, pageY];
  ck.Matrix.mapPoints(inv, pts);
  return { x: pts[0]!, y: pts[1]! };
}
