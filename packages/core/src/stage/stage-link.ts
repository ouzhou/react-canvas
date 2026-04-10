import type { ViewNode } from "../scene/view-node.ts";
import type { Stage } from "./stage.ts";

const LAYER_ROOT_STAGE = Symbol.for("@react-canvas/core.layerRootStage");

/** 由 {@link Layer} 在根 `ViewNode` 上标记，供场景节点解析所属 `Stage`（如异步图片重绘）。 */
export function markLayerRootWithStage(root: ViewNode, stage: Stage): void {
  (root as unknown as Record<symbol, Stage>)[LAYER_ROOT_STAGE] = stage;
}

/**
 * 沿父链查找最近的 Layer 根并返回其 `Stage`；未挂载到任何 Layer 下时返回 `null`。
 */
export function getStageFromViewNode(start: ViewNode | null): Stage | null {
  let n: ViewNode | null = start;
  while (n) {
    const s = (n as unknown as Record<symbol, Stage | undefined>)[LAYER_ROOT_STAGE];
    if (s) return s;
    n = n.parent;
  }
  return null;
}
