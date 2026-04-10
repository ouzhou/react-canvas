import type { CanvasKit, Surface } from "canvaskit-wasm";
import { resetDefaultParagraphFontLoaderForTests } from "../text/default-paragraph-font.ts";
import type { ViewportCamera } from "../render/camera.ts";
import { resetParagraphFontStateForTests } from "../text/paragraph-build.ts";
import type { ViewNode } from "../scene/view-node.ts";

import { FrameScheduler, type FrameSchedulerHooks } from "./frame-scheduler.ts";

const schedulersBySurface = new WeakMap<Surface, FrameScheduler>();

/** Strong refs for {@link resetLayoutPaintQueueForTests}（WeakMap 不可遍历）。 */
const surfacesWithPendingWork = new Set<Surface>();

function defaultSchedulerHooks(): FrameSchedulerHooks {
  return {
    onPendingFrame: (surf) => {
      surfacesWithPendingWork.add(surf);
    },
    onFrameComplete: (surf) => {
      surfacesWithPendingWork.delete(surf);
    },
  };
}

/**
 * 为一块 {@link Surface} 创建调度器并写入模块表；{@link Stage} 与仅调用 `queue*` 的代码路径共用同一实例。
 */
export function createAndBindFrameScheduler(surface: Surface): FrameScheduler {
  const sch = new FrameScheduler(surface, defaultSchedulerHooks());
  schedulersBySurface.set(surface, sch);
  return sch;
}

function getScheduler(surface: Surface): FrameScheduler {
  const existing = schedulersBySurface.get(surface);
  if (existing) return existing;
  return createAndBindFrameScheduler(surface);
}

/** 测试或调试：查看已为该 Surface 注册的调度器（若尚未排队则可能不存在）。 */
export function peekSchedulerForSurface(surface: Surface): FrameScheduler | undefined {
  return schedulersBySurface.get(surface);
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

/** 多 Layer 根节点：按数组顺序布局，绘制时后者叠在前者之上。 */
export function queueLayoutPaintFrames(
  surface: Surface,
  canvasKit: CanvasKit,
  rootNodes: ViewNode[],
  width: number,
  height: number,
  dpr: number,
  camera?: ViewportCamera | null,
): void {
  getScheduler(surface).queueLayoutPaintFrames(canvasKit, rootNodes, width, height, dpr, camera);
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

export function queuePaintOnlyFrames(
  surface: Surface,
  canvasKit: CanvasKit,
  rootNodes: ViewNode[],
  width: number,
  height: number,
  dpr: number,
  camera?: ViewportCamera | null,
): void {
  getScheduler(surface).queuePaintOnlyFrames(canvasKit, rootNodes, width, height, dpr, camera);
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
    schedulersBySurface.delete(surface);
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
