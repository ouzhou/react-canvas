import {
  attachCanvasStagePointer,
  attachSceneSkiaPresenter,
  type SceneRuntime,
  type TypefaceFontProvider,
} from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export type SceneSkiaCanvasProps = {
  runtime: SceneRuntime;
  width: number;
  height: number;
  paragraphFontProvider?: TypefaceFontProvider | null;
  defaultParagraphFontFamily?: string;
};

/**
 * Skia（CanvasKit）绘制 + 画布指针转发；实现均在 `@react-canvas/core-v2`。
 */
export function SceneSkiaCanvas(props: SceneSkiaCanvasProps): ReactNode {
  const { runtime, width, height, paragraphFontProvider, defaultParagraphFontFamily } = props;
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let detachSkia: (() => void) | undefined;
    let detachPointer: (() => void) | undefined;
    let cancelled = false;

    const dpr =
      typeof globalThis !== "undefined" &&
      "devicePixelRatio" in globalThis &&
      typeof (globalThis as { devicePixelRatio?: number }).devicePixelRatio === "number"
        ? (globalThis as { devicePixelRatio: number }).devicePixelRatio
        : 1;

    void attachSceneSkiaPresenter(runtime, canvas, {
      dpr,
      paragraphFontProvider,
      defaultParagraphFontFamily,
    })
      .then((detach) => {
        if (!cancelled) detachSkia = detach;
      })
      .catch((e: unknown) => {
        console.error("[@react-canvas/react-v2] attachSceneSkiaPresenter failed:", e);
      });

    detachPointer = attachCanvasStagePointer(canvas, runtime);

    return () => {
      cancelled = true;
      detachSkia?.();
      detachPointer?.();
    };
  }, [runtime, width, height, paragraphFontProvider, defaultParagraphFontFamily]);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        width,
        height,
        zIndex: 0,
      }}
    />
  );
}
