/**
 * 文档站 Mobile App Lab 用的视口 / 检视占位实现。
 * 不依赖独立 `@react-canvas/plugin-*` 包；后续若恢复独立包，可再改回 workspace 依赖。
 */
import type { ViewNode, ViewportCamera } from "@react-canvas/core";
import type { CSSProperties, Dispatch, RefObject, SetStateAction } from "react";
import { useState } from "react";

export type InspectorState = {
  hoverNode: ViewNode | null;
  scopeStack: unknown[];
};

export function attachInspectorHandlers(
  _canvas: HTMLCanvasElement,
  _opts: {
    logicalWidth: number;
    logicalHeight: number;
    onStateChange: Dispatch<SetStateAction<InspectorState>>;
  },
): () => void {
  return () => {};
}

export function InspectorHighlight(_props: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  node: ViewNode | null;
  logicalWidth: number;
  logicalHeight: number;
  cameraRevision: unknown;
  className?: string;
  style?: CSSProperties;
}): null {
  return null;
}

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
