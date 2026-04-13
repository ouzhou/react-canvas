import type { LayoutCommitPayload } from "../runtime/scene-runtime.ts";
import { PICK_ID_EMPTY, rgbaToPickId } from "./pick-id-codec.ts";

export class PickBuffer {
  readonly pickIdMap: Map<number, string> = new Map();
  readonly nodeIdMap: Map<string, number> = new Map();

  rebuildPickIdMap(commit: LayoutCommitPayload): void {
    this.pickIdMap.clear();
    this.nodeIdMap.clear();

    let nextId = 1;
    const { nodes } = commit.scene;
    const { layout } = commit;

    const stack: string[] = [commit.rootId];
    while (stack.length > 0) {
      const id = stack.pop()!;
      const layoutEntry = layout[id] as Record<string, unknown> | undefined;

      if (layoutEntry && layoutEntry["pointerEvents"] === "none") {
        continue;
      }

      const pickId = nextId++;
      this.pickIdMap.set(pickId, id);
      this.nodeIdMap.set(id, pickId);

      const node = nodes[id];
      if (node && node.children.length > 0) {
        // Push children in reverse order so first child is processed first (DFS pre-order)
        for (let i = node.children.length - 1; i >= 0; i--) {
          stack.push(node.children[i]!);
        }
      }
    }
  }

  hitAtWithReader(
    stageX: number,
    stageY: number,
    rootScale: number,
    readPixelFn: (px: number, py: number) => [number, number, number, number] | null,
  ): string | null {
    const px = Math.floor(stageX * rootScale);
    const py = Math.floor(stageY * rootScale);
    const pixel = readPixelFn(px, py);
    if (!pixel) return null;
    const [r, g, b] = pixel;
    const pickId = rgbaToPickId(r, g, b);
    if (pickId === PICK_ID_EMPTY) return null;
    return this.pickIdMap.get(pickId) ?? null;
  }
}
