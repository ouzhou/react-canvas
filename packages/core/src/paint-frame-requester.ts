let paintFrameRequester: (() => void) | null = null;

export function registerPaintFrameRequester(fn: (() => void) | null): void {
  paintFrameRequester = fn;
}

/** Called when async image decode completes so the next frame repaints. */
export function requestRedrawFromImage(): void {
  paintFrameRequester?.();
}
