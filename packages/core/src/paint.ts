import type { RenderBackend } from "./types.ts";
import type { ViewNode } from "./view-node.ts";

export function paintScene(
  roots: ViewNode[],
  backend: RenderBackend,
  width: number,
  height: number,
): void {
  backend.clear(width, height);
  for (const child of roots) {
    paintNode(child, backend, width, height);
  }
}

function paintNode(node: ViewNode, backend: RenderBackend, width: number, height: number): void {
  const color = node.props.style?.backgroundColor ?? "#f5f5f5";
  backend.fillRect(0, 0, width, height, color);
  for (const child of node.children) {
    paintNode(child, backend, width, height);
  }
}
