import type { CanvasKit, Surface } from "canvaskit-wasm";
import { resetDefaultParagraphFontLoaderForTests } from "./default-paragraph-font.ts";
import { paintScene } from "./paint.ts";
import { resetParagraphFontStateForTests } from "./paragraph-build.ts";
import type { ViewNode } from "./view-node.ts";

let layoutPaintFrameQueued = false;
/** Browser rAF id from the last {@link Surface.requestAnimationFrame} scheduled by us. */
let pendingLayoutPaintRafId: number | null = null;

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
  const rafId = surface.requestAnimationFrame((skCanvas) => {
    layoutPaintFrameQueued = false;
    pendingLayoutPaintRafId = null;
    rootNode.calculateLayout(width, height, canvasKit);
    const paint = new canvasKit.Paint();
    paint.setAntiAlias(true);
    paintScene(rootNode, skCanvas, canvasKit, dpr, paint);
    paint.delete();
  });
  pendingLayoutPaintRafId = typeof rafId === "number" ? rafId : null;
}

/**
 * Cancel any in-flight layout/paint frame and reset coalescing state.
 * Call **before** {@link Surface.delete} so a pending callback cannot run on a freed canvas (WASM
 * "function signature mismatch" on e.g. {@link Canvas.scale}).
 */
export function resetLayoutPaintQueue(): void {
  const cancel = (globalThis as { cancelAnimationFrame?: (id: number) => void })
    .cancelAnimationFrame;
  if (pendingLayoutPaintRafId !== null && typeof cancel === "function") {
    cancel(pendingLayoutPaintRafId);
  }
  pendingLayoutPaintRafId = null;
  layoutPaintFrameQueued = false;
}

export function resetLayoutPaintQueueForTests(): void {
  resetLayoutPaintQueue();
  resetParagraphFontStateForTests();
  resetDefaultParagraphFontLoaderForTests();
}
