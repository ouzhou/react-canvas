import { paintScene, type CanvasKit, type Surface, type ViewNode } from "@react-canvas/core";

let layoutPaintFrameQueued = false;

export function queueLayoutPaintFrame(
  surface: Surface,
  canvasKit: CanvasKit,
  rootNode: ViewNode,
  width: number,
  height: number,
  dpr: number,
): void {
  if (layoutPaintFrameQueued) return;
  layoutPaintFrameQueued = true;
  surface.requestAnimationFrame((skCanvas) => {
    layoutPaintFrameQueued = false;
    rootNode.calculateLayout(width, height);
    const paint = new canvasKit.Paint();
    paint.setAntiAlias(true);
    paintScene(rootNode, skCanvas, canvasKit, dpr, paint);
    paint.delete();
  });
}

export function resetLayoutPaintQueueForTests(): void {
  layoutPaintFrameQueued = false;
}
