import type { NodeStore } from "../runtime/node-store.ts";
import { absoluteBoundsFor, type StageBounds } from "../layout/layout-sync.ts";

function containsPoint(x: number, y: number, b: StageBounds): boolean {
  return x >= b.left && x < b.left + b.width && y >= b.top && y < b.top + b.height;
}

/**
 * Stage 坐标下的最深命中节点；兄弟自 **最后一个** 子节点向前遍历（与绘制「后者在上」一致）。
 */
export function hitTestAt(
  stageX: number,
  stageY: number,
  rootId: string,
  store: NodeStore,
): string | null {
  function visit(id: string): string | null {
    const bounds = absoluteBoundsFor(id, store);
    if (!bounds || !containsPoint(stageX, stageY, bounds)) {
      return null;
    }
    const node = store.get(id);
    if (!node) return null;
    for (let i = node.children.length - 1; i >= 0; i--) {
      const hit = visit(node.children[i]!);
      if (hit !== null) return hit;
    }
    return id;
  }
  return visit(rootId);
}
