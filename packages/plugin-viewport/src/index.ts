/**
 * 占位包：使 workspace 可安装；真实实现可在后续迁入。
 */
import type { ViewportCamera } from "@react-canvas/core";
import { useState, type Dispatch, type SetStateAction } from "react";

export type ViewportState = ViewportCamera;

export function attachViewportHandlers(
  _canvas: HTMLCanvasElement,
  _opts: {
    logicalWidth: number;
    logicalHeight: number;
    primaryButtonPan: boolean;
    setState: Dispatch<SetStateAction<ViewportState>>;
    wheelPan: boolean;
  },
): () => void {
  return () => {};
}

export function useViewportState(): [ViewportState, Dispatch<SetStateAction<ViewportState>>] {
  return useState<ViewportState>({ translateX: 0, translateY: 0, scale: 1 });
}
