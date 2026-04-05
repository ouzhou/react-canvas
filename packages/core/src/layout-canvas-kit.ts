import type { CanvasKit } from "canvaskit-wasm";

let layoutCanvasKit: CanvasKit | null = null;

/** Set before `calculateLayout` / Yoga measure so `TextNode` measure can build Paragraphs. */
export function setLayoutCanvasKit(kit: CanvasKit | null): void {
  layoutCanvasKit = kit;
}

export function getLayoutCanvasKit(): CanvasKit | null {
  return layoutCanvasKit;
}

export function clearLayoutCanvasKit(): void {
  layoutCanvasKit = null;
}
