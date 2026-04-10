import type { CanvasKit } from "canvaskit-wasm";
import type { ViewportCamera } from "../render/camera.ts";
import { hitTest, hitTestAmongLayerRoots } from "./hit-test.ts";
import type { ViewNode } from "../scene/view-node.ts";

/** Max distance (logical px) between down and up for a synthetic `click`. */
export const DEFAULT_CLICK_MOVE_THRESHOLD_PX = 10;

export type PointerDownSnapshot = {
  pageX: number;
  pageY: number;
  target: ViewNode;
};

/** `ancestor` 是否在 `node` 沿 `parent` 向上的链上（含自身）。 */
function isAncestorInTree(ancestor: ViewNode, node: ViewNode): boolean {
  let n: ViewNode | null = node;
  while (n) {
    if (n === ancestor) return true;
    n = n.parent as ViewNode | null;
  }
  return false;
}

/**
 * 按下与抬起命中同一「控件」：同一节点，或父子之一（例如点在父 View 上、抬起在子 Text 上）。
 * 与 DOM 中在同一元素及其后代之间切换仍算一次 click 的常见行为一致。
 */
function releaseStillOnPressTarget(downTarget: ViewNode, upHit: ViewNode): boolean {
  if (upHit === downTarget) return true;
  return isAncestorInTree(downTarget, upHit) || isAncestorInTree(upHit, downTarget);
}

/**
 * `click` fires if movement is within threshold and release point still hits `down.target`
 *（与 `hitTest` 一致，含 `transform`），或与 `down.target` 成父子关系（见 {@link releaseStillOnPressTarget}）。
 */
export function shouldEmitClick(
  down: PointerDownSnapshot,
  pageX: number,
  pageY: number,
  sceneRoot: ViewNode | readonly ViewNode[],
  canvasKit: CanvasKit,
  moveThresholdPx: number = DEFAULT_CLICK_MOVE_THRESHOLD_PX,
  camera?: ViewportCamera | null,
): boolean {
  const dx = pageX - down.pageX;
  const dy = pageY - down.pageY;
  if (dx * dx + dy * dy > moveThresholdPx * moveThresholdPx) return false;
  const roots = Array.isArray(sceneRoot) ? sceneRoot : [sceneRoot];
  const up =
    roots.length === 1
      ? hitTest(roots[0]!, pageX, pageY, canvasKit, camera)
      : (hitTestAmongLayerRoots(roots, pageX, pageY, canvasKit, camera)?.hit ?? null);
  if (!up) return false;
  return releaseStillOnPressTarget(down.target, up);
}
