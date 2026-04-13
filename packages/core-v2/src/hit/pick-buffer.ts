import type { CanvasKit, Surface } from "canvaskit-wasm";

import type { LayoutCommitPayload } from "../runtime/scene-runtime.ts";
import { PICK_ID_EMPTY, pickIdToRgba, rgbaToPickId } from "./pick-id-codec.ts";

export class PickBuffer {
  readonly pickIdMap: Map<number, string> = new Map();
  readonly nodeIdMap: Map<string, number> = new Map();

  private pickSurface: Surface | null = null;
  private _ck: CanvasKit | null = null;
  private rootScale = 1;

  /** 待重建的 layout 快照；非 null 表示 pick surface 已过期，下次 hitAt 时重建。 */
  private pendingCommit: LayoutCommitPayload | null = null;

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

  /**
   * 标记 pick surface 需要在下次 `hitAt` 时重建（懒更新）。
   * 布局频繁提交时不会阻塞主线程；只有实际触发命中检测时才做一次真正的重绘。
   */
  markDirty(commit: LayoutCommitPayload, ck: CanvasKit, surface: Surface, rootScale: number): void {
    this.pickSurface = surface;
    this._ck = ck;
    this.rootScale = rootScale;
    this.pendingCommit = commit;
  }

  private flushIfDirty(): void {
    if (!this.pendingCommit || !this.pickSurface || !this._ck) return;
    const commit = this.pendingCommit;
    this.pendingCommit = null;
    this.rebuildSurface(commit, this._ck, this.pickSurface, this.rootScale);
  }

  rebuildSurface(
    commit: LayoutCommitPayload,
    ck: CanvasKit,
    surface: Surface,
    rootScale: number,
  ): void {
    this.pickSurface = surface;
    this._ck = ck;
    this.rootScale = rootScale;
    this.pendingCommit = null;

    const skCanvas = surface.getCanvas();
    skCanvas.save();
    skCanvas.scale(rootScale, rootScale);
    skCanvas.clear(ck.Color(0, 0, 0, 0));

    const paintFill = new ck.Paint();
    paintFill.setAntiAlias(false);
    paintFill.setStyle(ck.PaintStyle.Fill);

    const paintNode = (id: string): void => {
      const box = commit.layout[id];
      if (!box) return;
      const layoutEntry = box as Record<string, unknown>;
      if (layoutEntry["pointerEvents"] === "none") return;

      const pickId = this.nodeIdMap.get(id);
      const node = commit.scene.nodes[id];

      const ov = box.overflow;
      const brx = box.borderRadiusRx ?? 0;
      const bry = box.borderRadiusRy ?? 0;
      const bounds = ck.LTRBRect(
        box.absLeft,
        box.absTop,
        box.absLeft + box.width,
        box.absTop + box.height,
      );
      const clipPushed = ov === "hidden" || ov === "scroll";

      if (clipPushed) {
        skCanvas.save();
        if (brx > 0 || bry > 0) {
          skCanvas.clipRRect(ck.RRectXY(bounds, brx, bry), ck.ClipOp.Intersect, false);
        } else {
          skCanvas.clipRect(bounds, ck.ClipOp.Intersect, false);
        }
      }

      if (pickId !== undefined) {
        const [r, g, b, a] = pickIdToRgba(pickId);
        paintFill.setColor(ck.Color(r, g, b, a));
        if (brx > 0 || bry > 0) {
          skCanvas.drawRRect(ck.RRectXY(bounds, brx, bry), paintFill);
        } else {
          skCanvas.drawRect(bounds, paintFill);
        }
      }

      if (node) {
        if (box.nodeKind === "scrollView") {
          const syRaw = box.scrollY ?? 0;
          const sy = typeof syRaw === "number" && Number.isFinite(syRaw) ? syRaw : 0;
          skCanvas.save();
          skCanvas.translate(0, -sy);
          for (const childId of node.children) {
            paintNode(childId);
          }
          skCanvas.restore();
        } else {
          for (const childId of node.children) {
            paintNode(childId);
          }
        }
      }

      if (clipPushed) {
        skCanvas.restore();
      }
    };

    paintNode(commit.rootId);

    paintFill.delete();
    skCanvas.restore();
    surface.flush();
  }

  hitAt(stageX: number, stageY: number): string | null {
    this.flushIfDirty();
    if (!this.pickSurface || !this._ck) return null;
    const ck = this._ck;
    const px = Math.floor(stageX * this.rootScale);
    const py = Math.floor(stageY * this.rootScale);
    const skCanvas = this.pickSurface.getCanvas();
    const imageInfo = this.pickSurface.imageInfo();
    const pixels = skCanvas.readPixels(px, py, {
      width: 1,
      height: 1,
      colorType: ck.ColorType.RGBA_8888,
      alphaType: ck.AlphaType.Premul,
      colorSpace: imageInfo.colorSpace,
    });
    if (!pixels) return null;
    const arr = pixels as Uint8Array;
    const r = arr[0]!;
    const g = arr[1]!;
    const b = arr[2]!;
    const pickId = rgbaToPickId(r, g, b);
    if (pickId === PICK_ID_EMPTY) return null;
    return this.pickIdMap.get(pickId) ?? null;
  }
}
