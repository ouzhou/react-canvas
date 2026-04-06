import type { CanvasKit, Surface } from "canvaskit-wasm";
import { resetDefaultParagraphFontLoaderForTests } from "../text/default-paragraph-font.ts";
import { paintScene } from "../render/paint.ts";
import { resetParagraphFontStateForTests } from "../text/paragraph-build.ts";
import type { ViewNode } from "../scene/view-node.ts";

type SurfaceQueueState = {
  /** 下一帧是否执行 Yoga `calculateLayout`。 */
  pendingLayout: boolean;
  /** 下一帧是否执行 `paintScene`。 */
  pendingPaint: boolean;
  /** 已提交 rAF、回调尚未跑完（含同步立即执行的 mock rAF）。 */
  hasPendingFrame: boolean;
  pendingRafId: number | null;
  frameRoot: ViewNode | null;
  frameWidth: number;
  frameHeight: number;
  frameDpr: number;
  frameCanvasKit: CanvasKit | null;
};

const queueStateBySurface = new WeakMap<Surface, SurfaceQueueState>();

/** Strong refs for {@link resetLayoutPaintQueueForTests} (WeakMap 不可遍历). */
const surfacesWithPendingWork = new Set<Surface>();

function getQueueState(surface: Surface): SurfaceQueueState {
  let st = queueStateBySurface.get(surface);
  if (!st) {
    st = {
      pendingLayout: false,
      pendingPaint: false,
      hasPendingFrame: false,
      pendingRafId: null,
      frameRoot: null,
      frameWidth: 0,
      frameHeight: 0,
      frameDpr: 1,
      frameCanvasKit: null,
    };
    queueStateBySurface.set(surface, st);
  }
  return st;
}

function scheduleFrame(surface: Surface, st: SurfaceQueueState): void {
  if (st.hasPendingFrame) return;
  st.hasPendingFrame = true;
  surfacesWithPendingWork.add(surface);
  const rafId = surface.requestAnimationFrame((skCanvas) => {
    const doLayout = st.pendingLayout;
    const doPaint = st.pendingPaint;
    const root = st.frameRoot;
    const w = st.frameWidth;
    const h = st.frameHeight;
    const d = st.frameDpr;
    const ck = st.frameCanvasKit;
    st.pendingLayout = false;
    st.pendingPaint = false;
    if (root && ck) {
      if (doLayout) root.calculateLayout(w, h, ck);
      if (doPaint) {
        const paint = new ck.Paint();
        paint.setAntiAlias(true);
        paintScene(root, skCanvas, ck, d, paint);
        paint.delete();
      }
    }
    st.hasPendingFrame = false;
    st.pendingRafId = null;
    surfacesWithPendingWork.delete(surface);
  });
  /** 同步 rAF mock 会在返回前跑完回调；此时 hasPendingFrame 已为 false，勿用 rAF 返回值覆盖 pendingRafId。 */
  if (st.hasPendingFrame) {
    st.pendingRafId = typeof rafId === "number" ? rafId : null;
  }
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
  st.frameRoot = rootNode;
  st.frameWidth = width;
  st.frameHeight = height;
  st.frameDpr = dpr;
  st.frameCanvasKit = canvasKit;
  st.pendingLayout = true;
  st.pendingPaint = true;
  scheduleFrame(surface, st);
}

/**
 * 仅重绘（不跑 Yoga）；与 {@link queueLayoutPaintFrame} 共用同一 rAF 槽位。
 * 若已排队「布局+绘制」，则无需再调用。
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
  if (st.pendingLayout) return;
  st.frameRoot = rootNode;
  st.frameWidth = width;
  st.frameHeight = height;
  st.frameDpr = dpr;
  st.frameCanvasKit = canvasKit;
  st.pendingPaint = true;
  scheduleFrame(surface, st);
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
  if (st.pendingRafId !== null && typeof cancel === "function") {
    cancel(st.pendingRafId);
  }
  st.pendingRafId = null;
  st.hasPendingFrame = false;
  st.pendingLayout = false;
  st.pendingPaint = false;
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
