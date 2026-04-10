import type { SceneNode } from "../scene/scene-node.ts";
import type { NodeStore } from "../runtime/node-store.ts";

export type StageBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function syncOne(node: SceneNode): void {
  const l = node.yogaNode.getComputedLayout();
  node.layout = {
    left: l.left,
    top: l.top,
    width: l.width,
    height: l.height,
  };
}

/** 深度优先同步整棵场景树的 `layout`（相对父级的 Yoga computed layout）。 */
export function syncLayoutFromStore(rootId: string, store: NodeStore): void {
  function walk(id: string): void {
    const n = store.get(id);
    if (!n) return;
    syncOne(n);
    for (const cid of n.children) {
      walk(cid);
    }
  }
  walk(rootId);
}

/**
 * 根节点在 Stage 上为 (0,0)；子节点绝对坐标为祖先 `layout.left/top` 之和。
 */
export function absoluteBoundsFor(id: string, store: NodeStore): StageBounds | null {
  const node = store.get(id);
  if (!node || node.layout === null) return null;
  let left = node.layout.left;
  let top = node.layout.top;
  let pid = node.parentId;
  while (pid !== null) {
    const p = store.get(pid);
    if (!p || p.layout === null) return null;
    left += p.layout.left;
    top += p.layout.top;
    pid = p.parentId;
  }
  return {
    left,
    top,
    width: node.layout.width,
    height: node.layout.height,
  };
}

/** 对根调用 `calculateLayout`，再同步全树 `layout`。 */
export function calculateAndSyncLayout(
  store: NodeStore,
  rootId: string,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const root = store.get(rootId);
  if (!root) return;
  root.yogaNode.calculateLayout(viewportWidth, viewportHeight, store.yoga.DIRECTION_LTR);
  syncLayoutFromStore(rootId, store);
}
