import { resetLayoutPaintQueue, ViewNode } from "@react-canvas/core";
import { Children, isValidElement, useLayoutEffect, useRef, type ReactNode } from "react";
import Reconciler from "react-reconciler";
import { canvasBackingStoreSize } from "./canvas-backing-store.ts";
import { useCanvasRuntime } from "./context.ts";
import { attachCanvasPointerHandlers } from "../input/canvas-pointer.ts";
import {
  createCanvasHostConfig,
  type PaintFrameRef,
  type SceneContainer,
} from "../reconciler/host-config.ts";
import { View } from "../hosts/view.ts";

export type CanvasProps = {
  width: number;
  height: number;
  children: ReactNode;
};

function assertSingleViewChild(children: ReactNode): void {
  const n = Children.count(children);
  if (n !== 1) {
    throw new Error(
      "[react-canvas] <Canvas> must have exactly one child, and it must be <View> (wrap multiple views in a parent <View>).",
    );
  }
  const only = Children.only(children);
  if (!isValidElement(only) || only.type !== View) {
    throw new Error(
      "[react-canvas] <Canvas> must have exactly one child, and it must be <View> (wrap multiple views in a parent <View>).",
    );
  }
}

export function Canvas({ width, height, children }: CanvasProps) {
  assertSingleViewChild(children);
  const { yoga, canvasKit } = useCanvasRuntime();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<PaintFrameRef>({
    surface: null,
    canvasKit: null,
    sceneRoot: null,
    width: 0,
    height: 0,
    dpr: 1,
  });

  const reconcilerRef = useRef<ReturnType<typeof Reconciler> | null>(null);
  const rootRef = useRef<unknown>(null);
  const containerRef = useRef<SceneContainer | null>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const devicePixelRatio =
      typeof globalThis !== "undefined" && "devicePixelRatio" in globalThis
        ? ((globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1)
        : 1;

    const lw = Math.max(1, Math.round(width));
    const lh = Math.max(1, Math.round(height));
    const { bw, bh, rootScale } = canvasBackingStoreSize(lw, lh, devicePixelRatio);
    canvas.width = bw;
    canvas.height = bh;
    canvas.style.width = `${lw}px`;
    canvas.style.height = `${lh}px`;

    const surface =
      typeof globalThis.WebGLRenderingContext === "function"
        ? (canvasKit.MakeWebGLCanvasSurface(canvas) ?? canvasKit.MakeSWCanvasSurface(canvas))
        : canvasKit.MakeSWCanvasSurface(canvas);
    if (!surface) {
      throw new Error("[react-canvas] Failed to create a CanvasKit surface for <canvas>.");
    }

    frameRef.current.surface = surface;
    frameRef.current.canvasKit = canvasKit;
    frameRef.current.width = lw;
    frameRef.current.height = lh;
    frameRef.current.dpr = rootScale;

    const sceneRoot = new ViewNode(yoga, "View");
    sceneRoot.setStyle({ width: "100%", height: "100%" });
    frameRef.current.sceneRoot = sceneRoot;
    const container: SceneContainer = { sceneRoot };
    containerRef.current = container;

    const reconciler = Reconciler(createCanvasHostConfig(yoga, frameRef.current) as never);
    reconcilerRef.current = reconciler;

    const root = reconciler.createContainer(
      container,
      1,
      null,
      false,
      null,
      "",
      (err: Error) => {
        throw err;
      },
      () => {},
      () => {},
      () => {},
    );
    rootRef.current = root;

    const detachPointer = attachCanvasPointerHandlers(canvas, sceneRoot, lw, lh);

    return () => {
      detachPointer();
      reconciler.updateContainer(null, root, null, () => {});
      sceneRoot.destroy();
      reconcilerRef.current = null;
      rootRef.current = null;
      containerRef.current = null;
      frameRef.current.sceneRoot = null;
      resetLayoutPaintQueue(surface);
      surface.delete();
      frameRef.current.surface = null;
      frameRef.current.canvasKit = null;
    };
  }, [yoga, canvasKit, width, height]);

  useLayoutEffect(() => {
    const reconciler = reconcilerRef.current;
    const root = rootRef.current;
    if (!reconciler || !root) return;
    reconciler.updateContainer(children, root as never, null, () => {});
  }, [children, width, height]);

  /** `canvas` 默认为 inline 替换元素，易产生基线下方空隙，导致与 flex/grid 同排时高度不一致 */
  return <canvas ref={canvasRef} style={{ display: "block" }} />;
}
