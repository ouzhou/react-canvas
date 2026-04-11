import type { NodeStore } from "../runtime/node-store.ts";

const DEFAULT_CURSOR = "default";

/**
 * 自命中叶沿父链向根查找第一个显式设置 `viewStyle.cursor` 的节点。
 * `leafId === null` 或链上皆无 → `"default"`。
 */
export function resolveCursorFromHitLeaf(leafId: string | null, store: NodeStore): string {
  if (leafId === null) {
    return DEFAULT_CURSOR;
  }
  let id: string | null = leafId;
  while (id !== null) {
    const n = store.get(id);
    if (!n) {
      return DEFAULT_CURSOR;
    }
    const c = n.viewStyle?.cursor;
    if (c !== undefined) {
      return c;
    }
    id = n.parentId;
  }
  return DEFAULT_CURSOR;
}
