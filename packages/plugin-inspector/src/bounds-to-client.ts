import {
  getWorldBounds,
  type CanvasKit,
  type ViewNode,
  type ViewportCamera,
} from "@react-canvas/core";
import { logicalToCanvasClient } from "./client-to-logical.ts";
import { scenePointToViewportLogical } from "./scene-to-viewport.ts";

export function worldBoundsToClientRect(
  node: ViewNode,
  sceneRoot: ViewNode,
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
  canvasKit: CanvasKit,
  camera: ViewportCamera | null,
): { left: number; top: number; width: number; height: number } {
  const b = getWorldBounds(node, sceneRoot);
  const tl = scenePointToViewportLogical(canvasKit, camera, b.left, b.top);
  const br = scenePointToViewportLogical(canvasKit, camera, b.left + b.width, b.top + b.height);
  const c1 = logicalToCanvasClient(tl.x, tl.y, canvas, logicalWidth, logicalHeight);
  const c2 = logicalToCanvasClient(br.x, br.y, canvas, logicalWidth, logicalHeight);
  const left = Math.min(c1.x, c2.x);
  const top = Math.min(c1.y, c2.y);
  return {
    left,
    top,
    width: Math.abs(c2.x - c1.x),
    height: Math.abs(c2.y - c1.y),
  };
}
