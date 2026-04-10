import type { CanvasKit, Surface } from "canvaskit-wasm";
import { resetDefaultParagraphFontLoaderForTests } from "../text/default-paragraph-font.ts";
import type { ViewportCamera } from "../render/camera.ts";
import { resetParagraphFontStateForTests } from "../text/paragraph-build.ts";
import type { ViewNode } from "../scene/view-node.ts";

import { FrameScheduler } from "./frame-scheduler.ts";

const schedulersBySurface = new WeakMap<Surface, FrameScheduler>();

/** Strong refs for {@link resetLayoutPaintQueueForTests}（WeakMap 不可遍历）。 */
const surfacesWithPendingWork = new Set<Surface>();

function getScheduler(surface: Surface): FrameScheduler {
  let s = schedulersBySurface.get(surface);
  if (!s) {
    s = new FrameScheduler(surface, {
      onPendingFrame: (surf) => {
        surfacesWithPendingWork.add(surf);
      },
      onFrameComplete: (surf) => {
        surfacesWithPendingWork.delete(surf);
      },
    });
    schedulersBySurface.set(surface, s);
  }
  return s;
}

export function queueLayoutPaintFrame(
  surface: Surface,
  canvasKit: CanvasKit,
  rootNode: ViewNode,
  width: number,
  height: number,
  dpr: number,
  camera?: ViewportCamera | null,
): void {
  getScheduler(surface).queueLayoutPaintFrame(canvasKit, rootNode, width, height, dpr, camera);
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
  camera?: ViewportCamera | null,
): void {
  getScheduler(surface).queuePaintOnlyFrame(canvasKit, rootNode, width, height, dpr, camera);
}

/**
 * Cancel any in-flight layout/paint frame for **this** surface and reset its coalescing state.
 * Call **before** {@link Surface.delete} so a pending callback cannot run on a freed canvas (WASM
 * "function signature mismatch" on e.g. {@link Canvas.scale}).
 */
export function resetLayoutPaintQueue(surface: Surface): void {
  const sch = schedulersBySurface.get(surface);
  if (sch) {
    sch.reset();
  }
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
