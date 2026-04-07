import { type ViewNode, type ViewportCamera } from "@react-canvas/core";
import { getCanvasFrame } from "@react-canvas/react";
import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import { worldBoundsToClientRect } from "./bounds-to-client.ts";

export type InspectorHighlightProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  node: ViewNode | null;
  logicalWidth: number;
  logicalHeight: number;
  /** 与 `<Canvas camera={…}>` 同步，用于视口变化时重算屏幕矩形 */
  cameraRevision: ViewportCamera | null;
  className?: string;
  style?: CSSProperties;
};

/**
 * 在画布上方用 DOM 画一层固定定位的描边（与 `getCanvasFrame` + 相机变换一致）。
 */
export function InspectorHighlight({
  canvasRef,
  node,
  logicalWidth,
  logicalHeight,
  cameraRevision,
  className,
  style,
}: InspectorHighlightProps) {
  const [box, setBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !node) {
      setBox(null);
      return;
    }
    const frame = getCanvasFrame(canvas);
    const sceneRoot = frame?.sceneRoot;
    if (!frame || !sceneRoot) {
      setBox(null);
      return;
    }
    /** 无布局的节点不画 */
    if (node.layout.width <= 0 || node.layout.height <= 0) {
      setBox(null);
      return;
    }
    setBox(
      worldBoundsToClientRect(
        node,
        sceneRoot,
        canvas,
        logicalWidth,
        logicalHeight,
        frame.canvasKit,
        frame.camera,
      ),
    );
  }, [canvasRef, node, logicalWidth, logicalHeight, cameraRevision]);

  if (!box || box.width <= 0 || box.height <= 0) return null;

  return (
    <div
      className={className}
      style={{
        position: "fixed",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        pointerEvents: "none",
        boxSizing: "border-box",
        ...style,
      }}
    />
  );
}
