import { buildPathToRoot, type ViewNode } from "@react-canvas/core";

function isDescendantOf(node: ViewNode, ancestor: ViewNode): boolean {
  let cur: ViewNode | null = node;
  while (cur !== null) {
    if (cur === ancestor) return true;
    cur = cur.parent as ViewNode | null;
  }
  return false;
}

/**
 * - No scope: deepest hit (`leaf`) — same as {@link hitTest}.
 * - With scope: first child of `scope` on the path from root to `leaf` (Figma-style drill layer).
 *   If `leaf` is not under `scope`, returns `null`.
 */
export function pickHoverNode(
  leaf: ViewNode | null,
  scope: ViewNode | null,
  sceneRoot: ViewNode,
): ViewNode | null {
  if (!leaf) return null;
  if (!scope) return leaf;
  if (!isDescendantOf(leaf, scope)) return null;
  const path = buildPathToRoot(leaf, sceneRoot);
  const si = path.indexOf(scope);
  if (si < 0) return null;
  if (si + 1 < path.length) return path[si + 1]!;
  return leaf;
}
