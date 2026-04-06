import type { SceneNode } from "../scene/scene-node.ts";
import type { ViewNode } from "../scene/view-node.ts";

function zIndexOf(node: ViewNode): number {
  const z = node.props.zIndex;
  return typeof z === "number" && Number.isFinite(z) ? z : 0;
}

/**
 * 与绘制、命中一致：按 `zIndex` 升序（小的先画、大的后画即在上层），`zIndex` 相同则保持 React/Yoga 子顺序。
 * 不改变 `node.children` 数组顺序（Yoga 树不变）。
 */
export function getSortedChildrenForPaint(node: ViewNode): SceneNode[] {
  return [...node.children]
    .map((child, index) => ({ child, index }))
    .sort((a, b) => {
      const za = zIndexOf(a.child as ViewNode);
      const zb = zIndexOf(b.child as ViewNode);
      if (za !== zb) return za - zb;
      return a.index - b.index;
    })
    .map(({ child }) => child);
}
