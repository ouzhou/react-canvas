import type { Yoga } from "yoga-layout/load";
import { Edge } from "yoga-layout/load";
import type { ParagraphSpan } from "./paragraph-build.ts";
import { measureParagraphSpans } from "./paragraph-build.ts";
import type { SceneNode } from "./scene-node.ts";
import type { TextOnlyProps, TextStyle } from "./text-style.ts";
import { mergeTextProps, splitTextStyle } from "./text-style.ts";
import { ViewNode } from "./view-node.ts";

/** Opaque string leaf for reconciler (`createTextInstance`); `nodeValue` is mutated on updates. */
export type TextInstance = { nodeValue: string };

export function isTextInstance(x: unknown): x is TextInstance {
  return (
    typeof x === "object" &&
    x !== null &&
    "nodeValue" in x &&
    typeof (x as TextInstance).nodeValue === "string"
  );
}

export type TextSlot = { kind: "string"; ref: TextInstance } | { kind: "text"; node: TextNode };

/**
 * Text host: Yoga leaf with measure. Nested `<Text>` under `<Text>` does not get a Yoga child — only
 * the outer Text participates in the flex tree; inner nodes hold span/style data.
 */
export class TextNode extends ViewNode {
  textProps: TextOnlyProps = {};
  /** Ordered mix of string leaves and nested `TextNode` (only outer node uses Yoga). */
  slots: TextSlot[] = [];

  constructor(yoga: Yoga) {
    super(yoga, "Text");
    this.yogaNode.setMeasureFunc((width, widthMode, height, heightMode) => {
      const spans = collectParagraphSpans(this);
      const padL = this.yogaNode.getComputedPadding(Edge.Left);
      const padR = this.yogaNode.getComputedPadding(Edge.Right);
      const w = Number.isFinite(width) ? width : 0;
      const innerW = Math.max(0, w - padL - padR);
      return measureParagraphSpans(this.textProps, spans, innerW, widthMode, height, heightMode);
    });
  }

  setStyle(style: TextStyle): void {
    const { layout, text } = splitTextStyle(style);
    this.textProps = { ...this.textProps, ...text };
    super.setStyle(layout);
  }

  updateStyle(oldStyle: TextStyle, newStyle: TextStyle): void {
    const { layout: oLayout, text: oText } = splitTextStyle(oldStyle);
    const { layout: nLayout, text: nText } = splitTextStyle(newStyle);
    const keys = new Set([...Object.keys(oText), ...Object.keys(nText)]) as Set<
      keyof TextOnlyProps
    >;
    let textChanged = false;
    const mergedText = { ...this.textProps } as Record<
      keyof TextOnlyProps,
      TextOnlyProps[keyof TextOnlyProps] | undefined
    >;
    for (const k of keys) {
      if (oText[k] !== nText[k]) {
        mergedText[k] = nText[k];
        textChanged = true;
      }
    }
    if (textChanged) {
      this.textProps = mergedText as TextOnlyProps;
      this.dirty = true;
      this.yogaNode.markDirty();
    }
    super.updateStyle(oLayout, nLayout);
  }

  appendTextSlot(ref: TextInstance): void {
    this.slots.push({ kind: "string", ref });
    this.dirty = true;
    this.yogaNode.markDirty();
  }

  insertTextBefore(ref: TextInstance, beforeRef: TextInstance): void {
    const idx = this.slots.findIndex((s) => s.kind === "string" && s.ref === beforeRef);
    if (idx === -1) {
      throw new Error("[react-canvas] insertTextBefore: beforeRef not found.");
    }
    this.slots.splice(idx, 0, { kind: "string", ref });
    this.dirty = true;
    this.yogaNode.markDirty();
  }

  appendChild(child: SceneNode): void {
    if (child instanceof TextNode) {
      child.parent = this;
      this.children.push(child);
      this.slots.push({ kind: "text", node: child });
      child.yogaMounted = false;
      this.dirty = true;
      this.yogaNode.markDirty();
      return;
    }
    throw new Error("[react-canvas] Text cannot contain View.");
  }

  removeChild(child: SceneNode | TextInstance): void {
    if (isTextInstance(child)) {
      const idx = this.slots.findIndex((s) => s.kind === "string" && s.ref === child);
      if (idx === -1) return;
      this.slots.splice(idx, 1);
      this.dirty = true;
      this.yogaNode.markDirty();
      return;
    }
    if (child instanceof TextNode) {
      const i = this.children.indexOf(child);
      if (i === -1) return;
      const si = this.slots.findIndex((s) => s.kind === "text" && s.node === child);
      if (si !== -1) this.slots.splice(si, 1);
      this.children.splice(i, 1);
      child.parent = null;
      this.dirty = true;
      this.yogaNode.markDirty();
      return;
    }
    throw new Error("[react-canvas] Text cannot contain View.");
  }

  insertBefore(child: SceneNode, before: SceneNode | TextInstance): void {
    if (child === before) return;
    if (!(child instanceof TextNode)) {
      throw new Error("[react-canvas] Text cannot contain View.");
    }
    if (isTextInstance(before)) {
      const slotIdx = this.slots.findIndex((s) => s.kind === "string" && s.ref === before);
      if (slotIdx === -1) {
        this.appendChild(child);
        return;
      }
      if (child.parent && child.parent !== this) {
        child.parent.removeChild(child);
      }
      if (child.parent === this) {
        const cur = this.children.indexOf(child);
        if (cur !== -1) {
          this.children.splice(cur, 1);
          const si = this.slots.findIndex((s) => s.kind === "text" && s.node === child);
          if (si !== -1) this.slots.splice(si, 1);
        }
      }
      child.parent = this;
      let textNodesBefore = 0;
      for (let i = 0; i < slotIdx; i++) {
        if (this.slots[i].kind === "text") textNodesBefore++;
      }
      this.children.splice(textNodesBefore, 0, child);
      this.slots.splice(slotIdx, 0, { kind: "text", node: child });
      this.dirty = true;
      this.yogaNode.markDirty();
      return;
    }
    if (!(before instanceof TextNode)) {
      throw new Error("[react-canvas] Text cannot contain View.");
    }
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
        this.children.splice(cur, 1);
        const si = this.slots.findIndex((s) => s.kind === "text" && s.node === child);
        if (si !== -1) this.slots.splice(si, 1);
      }
    }
    child.parent = this;
    const insertAt = this.children.indexOf(before);
    this.children.splice(insertAt, 0, child);
    const slotBefore = this.slots.findIndex((s) => s.kind === "text" && s.node === before);
    if (slotBefore === -1) {
      this.appendChild(child);
      return;
    }
    this.slots.splice(slotBefore, 0, { kind: "text", node: child });
    this.dirty = true;
    this.yogaNode.markDirty();
  }

  /** Spans for Paragraph measure/paint (nested `<Text>` flattened with merged styles). */
  getParagraphSpans(): ParagraphSpan[] {
    return collectParagraphSpans(this);
  }

  override destroy(): void {
    this.slots.length = 0;
    super.destroy();
  }
}

function collectSpans(node: TextNode, inherited: TextOnlyProps): ParagraphSpan[] {
  const merged = mergeTextProps(inherited, node.textProps);
  const out: ParagraphSpan[] = [];
  for (const slot of node.slots) {
    if (slot.kind === "string") {
      const t = slot.ref.nodeValue;
      if (t.length > 0) out.push({ style: merged, text: t });
    } else {
      out.push(...collectSpans(slot.node, merged));
    }
  }
  return out;
}

export function collectParagraphSpans(root: TextNode): ParagraphSpan[] {
  return collectSpans(root, {});
}
