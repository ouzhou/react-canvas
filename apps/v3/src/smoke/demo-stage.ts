import {
  DEMO_BORDER,
  DEMO_CURSOR,
  DEMO_HOVER,
  DEMO_LAYOUT,
  DEMO_MEDIA,
  DEMO_MODAL,
  DEMO_POINTER,
  DEMO_STYLE,
  DEMO_TEXT,
  DEMO_THROUGH,
} from "../demo-dimensions.ts";
import type { SmokeDemoId } from "../smoke-types.ts";

export function demoStageSize(demo: SmokeDemoId): { dw: number; dh: number } {
  const dw =
    demo === "layout"
      ? DEMO_LAYOUT.w
      : demo === "pointer"
        ? DEMO_POINTER.w
        : demo === "through"
          ? DEMO_THROUGH.w
          : demo === "cursor"
            ? DEMO_CURSOR.w
            : demo === "modal"
              ? DEMO_MODAL.w
              : demo === "text"
                ? DEMO_TEXT.w
                : demo === "style"
                  ? DEMO_STYLE.w
                  : demo === "border"
                    ? DEMO_BORDER.w
                    : demo === "media"
                      ? DEMO_MEDIA.w
                      : DEMO_HOVER.w;
  const dh =
    demo === "layout"
      ? DEMO_LAYOUT.h
      : demo === "pointer"
        ? DEMO_POINTER.h
        : demo === "through"
          ? DEMO_THROUGH.h
          : demo === "cursor"
            ? DEMO_CURSOR.h
            : demo === "modal"
              ? DEMO_MODAL.h
              : demo === "text"
                ? DEMO_TEXT.h
                : demo === "style"
                  ? DEMO_STYLE.h
                  : demo === "border"
                    ? DEMO_BORDER.h
                    : demo === "media"
                      ? DEMO_MEDIA.h
                      : DEMO_HOVER.h;
  return { dw, dh };
}
