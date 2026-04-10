import type { ViewNode } from "../scene/view-node.ts";

/**
 * 画布内焦点（无 DOM focus）；与 `core-design.md` §14.4 一致。
 */
export class FocusManager {
  private focused: ViewNode | null = null;

  /**
   * `pointerdown` 命中结果：无命中或不可聚焦时 `blur`；否则将焦点移到 `hit`。
   */
  onPointerDownHit(hit: ViewNode | null): void {
    if (!hit) {
      this.blur();
      return;
    }
    if (hit.props.focusable === false) {
      this.blur();
      return;
    }
    this.focus(hit);
  }

  focus(node: ViewNode): void {
    if (this.focused === node) return;
    if (this.focused) {
      this.focused.applyInteractionPatch({ focused: false });
    }
    this.focused = node;
    node.applyInteractionPatch({ focused: true });
  }

  blur(): void {
    if (!this.focused) return;
    const n = this.focused;
    this.focused = null;
    n.applyInteractionPatch({ focused: false });
  }

  get focusedNode(): ViewNode | null {
    return this.focused;
  }
}
