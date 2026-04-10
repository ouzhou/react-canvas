/**
 * 占位包：使 workspace 可安装；真实实现可在后续迁入。
 */
import type { ViewNode } from "@react-canvas/core";
import type { CSSProperties, Dispatch, RefObject, SetStateAction } from "react";

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
