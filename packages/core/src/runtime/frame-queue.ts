import type { CanvasKit, Surface } from "canvaskit-wasm";
import { resetDefaultParagraphFontLoaderForTests } from "../text/default-paragraph-font.ts";
import { paintScene } from "../render/paint.ts";
import { resetParagraphFontStateForTests } from "../text/paragraph-build.ts";
import type { ViewNode } from "../scene/view-node.ts";

type PendingFrame = {
  canvasKit: CanvasKit;
  rootNode: ViewNode;
  width: number;
  height: number;
  dpr: number;
};

type SurfaceQueueState = {
  layoutPaintFrameQueued: boolean;
  pendingLayoutPaintRafId: number | null;
  /** Latest dimensions and nodes for the next RAF callback (updated on every queue call). */
  pendingFrame: PendingFrame | null;
  /**
   * When the next RAF callback runs, whether to run Yoga (`calculateLayout`) before paint.
   * `queueLayoutPaintFrame` sets true; `queuePaintOnlyFrame` sets false only when it is the
   * first request that schedules this callback — if a layout frame is already queued, this
   * stays true.
   */
  needsLayout: boolean;
};

const queueStateBySurface = new WeakMap<Surface, SurfaceQueueState>();

/** Strong refs for {@link resetLayoutPaintQueueForTests} (WeakMap 不可遍历). */
const surfacesWithPendingWork = new Set<Surface>();

function getQueueState(surface: Surface): SurfaceQueueState {
  let st = queueStateBySurface.get(surface);
  if (!st) {
    st = {
      layoutPaintFrameQueued: false,
      pendingLayoutPaintRafId: null,
      pendingFrame: null,
      needsLayout: false,
    };
    queueStateBySurface.set(surface, st);
  }
  return st;
}

function scheduleLayoutPaintFrame(surface: Surface, st: SurfaceQueueState): void {
  st.layoutPaintFrameQueued = true;
  surfacesWithPendingWork.add(surface);
  const rafId = surface.requestAnimationFrame((skCanvas) => {
    st.layoutPaintFrameQueued = false;
    st.pendingLayoutPaintRafId = null;
    surfacesWithPendingWork.delete(surface);
    const runLayout = st.needsLayout;
    st.needsLayout = false;
    const pf = st.pendingFrame;
    st.pendingFrame = null;
    if (!pf) return;
    const { canvasKit, rootNode, width, height, dpr } = pf;
    if (runLayout) {
      rootNode.calculateLayout(width, height, canvasKit);
    }
    const paint = new canvasKit.Paint();
    paint.setAntiAlias(true);
    paintScene(rootNode, skCanvas, canvasKit, dpr, paint);
    paint.delete();
  });
  st.pendingLayoutPaintRafId = typeof rafId === "number" ? rafId : null;
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
  st.pendingFrame = { canvasKit, rootNode, width, height, dpr };
  st.needsLayout = true;
  if (st.layoutPaintFrameQueued) return;
  scheduleLayoutPaintFrame(surface, st);
}

/**
 * Schedule a single paint pass without running Yoga layout. Coalesces with {@link queueLayoutPaintFrame}
 * on the same surface: if a layout frame is already queued, the next callback still runs layout.
 */
export function queuePaintOnlyFrame(
  surface: Surface,
  canvasKit: CanvasKit,
  rootNode: ViewNode,
  width: number,
  height: number,
  dpr: number,
): void {
  const st = getQueueState(surface);
  st.pendingFrame = { canvasKit, rootNode, width, height, dpr };
  if (st.layoutPaintFrameQueued) return;
  st.needsLayout = false;
  scheduleLayoutPaintFrame(surface, st);
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
  st.pendingFrame = null;
  st.needsLayout = false;
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
