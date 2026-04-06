import type { Node as YogaNode } from "yoga-layout/load";
import type { Yoga } from "yoga-layout/load";
import {
  applyRNLayoutDefaults,
  applyStylesToYoga,
  resetAndApplyStyles,
  splitStyle,
} from "../layout/yoga-map.ts";
import type { CanvasKit } from "canvaskit-wasm";
import type { SceneNode } from "./scene-node.ts";
import type { InteractionHandlers } from "../input/types.ts";
import type { TransformStyle, ViewStyle } from "../style/view-style.ts";
import { calculateLayoutRoot, syncLayoutFromYoga } from "../layout/layout.ts";

export type ViewVisualProps = {
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number;
  /** 见 `ViewStyle.cursor`；由指针管线同步到画布 DOM `cursor`。 */
  cursor?: string;
  display?: "flex" | "none";
  transform?: TransformStyle[];
  /** 见 `ViewStyle.zIndex`；由 paint / hit-test 读取。 */
  zIndex?: number;
};

export class ViewNode {
  readonly type: string;
  readonly yogaNode: YogaNode;
  parent: ViewNode | null = null;
  readonly children: SceneNode[] = [];
  props: ViewVisualProps = {};
  layout = { left: 0, top: 0, width: 0, height: 0 };
  dirty = false;
  /** Pointer / click handlers (set by reconciler commit). */
  interactionHandlers: InteractionHandlers = {};
  /**
   * When false, this node's Yoga node is not attached to the parent's Yoga tree (nested Text).
   * Used by layout/sync without importing `TextNode` (avoids layout ↔ text-node cycle).
   */
  yogaMounted = true;
  /** Avoid double-free when React has already torn down a subtree under this node. */
  private destroyed = false;

  constructor(
    readonly yoga: Yoga,
    type: string,
  ) {
    this.type = type;
    this.yogaNode = yoga.Node.create();
    applyRNLayoutDefaults(this.yogaNode);
  }

  setStyle(style: ViewStyle): void {
    const { visual } = splitStyle(style);
    this.props = { ...this.props, ...visual };
    if (style.display !== undefined) this.props.display = style.display;
    applyStylesToYoga(this.yogaNode, style);
  }

  updateStyle(oldStyle: ViewStyle, newStyle: ViewStyle): void {
    const keys = new Set([...Object.keys(oldStyle), ...Object.keys(newStyle)]) as Set<
      keyof ViewStyle
    >;
    let changed = false;
    const merged: ViewStyle = { ...oldStyle };
    const m = merged as Record<string, unknown>;
    for (const k of keys) {
      if (oldStyle[k] !== newStyle[k]) {
        m[k as string] = newStyle[k];
        changed = true;
      }
    }
    if (!changed) return;
    this.dirty = true;
    const { visual } = splitStyle(merged);
    this.props = { ...this.props, ...visual };
    if (merged.display !== undefined) this.props.display = merged.display;
    resetAndApplyStyles(this.yogaNode, merged);
  }

  appendChild(child: SceneNode): void {
    child.parent = this;
    this.children.push(child);
    this.yogaNode.insertChild(child.yogaNode, this.children.length - 1);
  }

  removeChild(child: SceneNode): void {
    const i = this.children.indexOf(child);
    if (i === -1) return;
    this.yogaNode.removeChild(child.yogaNode);
    this.children.splice(i, 1);
    child.parent = null;
  }

  insertBefore(child: SceneNode, before: SceneNode): void {
    if (child === before) return;
    if (child.parent && child.parent !== this) {
      child.parent.removeChild(child);
    }
    const beforeIndex = this.children.indexOf(before);
    if (beforeIndex === -1) {
      this.appendChild(child);
      return;
    }
    if (child.parent === this) {
      const cur = this.children.indexOf(child);
      if (cur !== -1) {
        this.yogaNode.removeChild(child.yogaNode);
        this.children.splice(cur, 1);
      }
    }
    child.parent = this;
    const insertAt = this.children.indexOf(before);
    if (insertAt === -1) {
      this.appendChild(child);
      return;
    }
    this.children.splice(insertAt, 0, child);
    this.yogaNode.insertChild(child.yogaNode, insertAt);
  }

  calculateLayout(width: number, height: number, canvasKit?: CanvasKit | null): void {
    calculateLayoutRoot(this, width, height, this.yoga.DIRECTION_LTR, canvasKit);
  }

  syncLayoutFromYogaTree(): void {
    syncLayoutFromYoga(this);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const c of this.children) {
      c.destroy();
    }
    this.children.length = 0;
    this.yogaNode.free();
    this.parent = null;
  }
}
