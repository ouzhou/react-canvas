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
 *
 * `scrollView`：`scrollY` 与绘制 `translate(0,-scrollY)` 互逆，子节点用 `stageY + 祖先 scrollY 之和` 判命中；视口盒仍用未偏移的 Stage 坐标。
 */
export function hitTestAt(
  stageX: number,
  stageY: number,
  rootId: string,
  store: NodeStore,
): string | null {
  /**
   * `yScrollAccum`：当前节点所有 **scrollView 祖先**（不含自身）的 `scrollY` 之和。
   * 非 `scrollView` 节点用 `(stageX, stageY + yScrollAccum)` 测盒；`scrollView` 视口用未偏移坐标。
   */
  function visit(id: string, yScrollAccum: number): string | null {
    const node = store.get(id);
    if (!node) return null;
    if (pointerEventsIsNone(node)) {
      return null;
    }
    const bounds = absoluteBoundsFor(id, store);
    if (!bounds) return null;

    const nk = node.kind ?? "view";
    if (nk === "scrollView") {
      if (!containsPoint(stageX, stageY, bounds)) {
        return null;
      }
    } else if (!containsPoint(stageX, stageY + yScrollAccum, bounds)) {
      return null;
    }

    const nextAccum =
      nk === "scrollView"
        ? yScrollAccum +
          (typeof node.scrollY === "number" && Number.isFinite(node.scrollY) ? node.scrollY : 0)
        : yScrollAccum;

    for (let i = node.children.length - 1; i >= 0; i--) {
      const hit = visit(node.children[i]!, nextAccum);
      if (hit !== null) return hit;
    }
    return id;
  }

  return visit(rootId, 0);
}
