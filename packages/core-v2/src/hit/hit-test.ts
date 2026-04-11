import type { NodeStore } from "../runtime/node-store.ts";
import type { SceneNode } from "../scene/scene-node.ts";
import { absoluteBoundsFor, type StageBounds } from "../layout/layout-sync.ts";

function containsPoint(x: number, y: number, b: StageBounds): boolean {
  return x >= b.left && x < b.left + b.width && y >= b.top && y < b.top + b.height;
}

function pointerEventsIsNone(node: SceneNode | undefined): boolean {
  return node?.viewStyle?.pointerEvents === "none";
}

/**
 * Stage 坐标下的最深命中节点；兄弟自 **最后一个** 子节点向前遍历（与绘制「后者在上」一致）。
 *
 * `style.pointerEvents === 'none'` 时该节点及**整棵子树**不参与命中（事件可落到背后同坐标下的祖先/兄弟）。
 */
export function hitTestAt(
  stageX: number,
  stageY: number,
  rootId: string,
  store: NodeStore,
): string | null {
  function visit(id: string): string | null {
    const node = store.get(id);
    if (!node) return null;
    if (pointerEventsIsNone(node)) {
      return null;
    }
    const bounds = absoluteBoundsFor(id, store);
    if (!bounds || !containsPoint(stageX, stageY, bounds)) {
      return null;
    }
    for (let i = node.children.length - 1; i >= 0; i--) {
      const hit = visit(node.children[i]!);
      if (hit !== null) return hit;
    }
    return id;
  }
  return visit(rootId);
}
