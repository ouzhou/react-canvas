import type { CanvasKit, Surface } from "canvaskit-wasm";
import { resetDefaultParagraphFontLoaderForTests } from "../text/default-paragraph-font.ts";
import { paintScene } from "../render/paint.ts";
import { resetParagraphFontStateForTests } from "../text/paragraph-build.ts";
import type { ViewNode } from "../scene/view-node.ts";

type SurfaceQueueState = {
  layoutPaintFrameQueued: boolean;
  pendingLayoutPaintRafId: number | null;
};

const queueStateBySurface = new WeakMap<Surface, SurfaceQueueState>();

/** Strong refs for {@link resetLayoutPaintQueueForTests} (WeakMap 不可遍历). */
const surfacesWithPendingWork = new Set<Surface>();

function getQueueState(surface: Surface): SurfaceQueueState {
  let st = queueStateBySurface.get(surface);
  if (!st) {
    st = { layoutPaintFrameQueued: false, pendingLayoutPaintRafId: null };
    queueStateBySurface.set(surface, st);
  }
  return st;
}

export function queueLayoutPaintFrame(
  surface: Surface,
  canvasKit: CanvasKit,
  rootNode: ViewNode,
  width: number,
  height: number,
  dpr: number,
): void {
  const st = getQueueState(surface);
  if (st.layoutPaintFrameQueued) return;
  st.layoutPaintFrameQueued = true;
  surfacesWithPendingWork.add(surface);
  const rafId = surface.requestAnimationFrame((skCanvas) => {
    st.layoutPaintFrameQueued = false;
    st.pendingLayoutPaintRafId = null;
    surfacesWithPendingWork.delete(surface);
    rootNode.calculateLayout(width, height, canvasKit);
    const paint = new canvasKit.Paint();
    paint.setAntiAlias(true);
    paintScene(rootNode, skCanvas, canvasKit, dpr, paint);
    paint.delete();
  });
  st.pendingLayoutPaintRafId = typeof rafId === "number" ? rafId : null;
}

/**
 * Cancel any in-flight layout/paint frame for **this** surface and reset its coalescing state.
 * Call **before** {@link Surface.delete} so a pending callback cannot run on a freed canvas (WASM
 * "function signature mismatch" on e.g. {@link Canvas.scale}).
 */
export function resetLayoutPaintQueue(surface: Surface): void {
  const st = queueStateBySurface.get(surface);
  if (!st) return;
  const cancel = (globalThis as { cancelAnimationFrame?: (id: number) => void })
    .cancelAnimationFrame;
  if (st.pendingLayoutPaintRafId !== null && typeof cancel === "function") {
    cancel(st.pendingLayoutPaintRafId);
  }
  st.pendingLayoutPaintRafId = null;
  st.layoutPaintFrameQueued = false;
  surfacesWithPendingWork.delete(surface);
}

export function resetLayoutPaintQueueForTests(): void {
  for (const surface of Array.from(surfacesWithPendingWork)) {
    resetLayoutPaintQueue(surface);
  }
  surfacesWithPendingWork.clear();
  resetParagraphFontStateForTests();
  resetDefaultParagraphFontLoaderForTests();
}
