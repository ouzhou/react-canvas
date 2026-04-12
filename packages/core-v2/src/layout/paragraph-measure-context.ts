import type { CanvasKit, TypefaceFontProvider } from "canvaskit-wasm";

export type ParagraphMeasureContext = {
  ck: CanvasKit;
  fontFamily: string;
  fontProvider: TypefaceFontProvider;
};

let ctx: ParagraphMeasureContext | null = null;

export function setParagraphMeasureContext(next: ParagraphMeasureContext | null): void {
  ctx = next;
}

export function getParagraphMeasureContext(): ParagraphMeasureContext | null {
  return ctx;
}
