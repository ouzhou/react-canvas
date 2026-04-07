import {
  buildViewportCameraMatrix,
  isViewportCameraIdentity,
  type CanvasKit,
  type ViewportCamera,
} from "@react-canvas/core";

/**
 * Scene-root layout coordinates → logical canvas coordinates **before** `clientToCanvasLogical` inverse.
 * Matches the forward transform of {@link logicalPointFromCameraViewport} in `@react-canvas/core`.
 */
export function scenePointToViewportLogical(
  canvasKit: CanvasKit,
  camera: ViewportCamera | null | undefined,
  sceneX: number,
  sceneY: number,
): { x: number; y: number } {
  if (isViewportCameraIdentity(camera)) {
    return { x: sceneX, y: sceneY };
  }
  const m = buildViewportCameraMatrix(canvasKit, camera!);
  const pts = [sceneX, sceneY];
  canvasKit.Matrix.mapPoints(m, pts);
  return { x: pts[0]!, y: pts[1]! };
}
