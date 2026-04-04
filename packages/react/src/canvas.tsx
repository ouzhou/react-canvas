import { ViewNode } from "@react-canvas/core";
import { Children, isValidElement, useLayoutEffect, useRef, type ReactNode } from "react";
import Reconciler from "react-reconciler";
import { useCanvasRuntime } from "./context.ts";
import {
  createCanvasHostConfig,
  type PaintFrameRef,
  type SceneContainer,
} from "./reconciler-config.ts";
import { View } from "./view.ts";

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

    const dpr =
      typeof globalThis !== "undefined" && "devicePixelRatio" in globalThis
        ? ((globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1)
        : 1;

    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const surface =
      typeof globalThis.WebGLRenderingContext === "function"
        ? (canvasKit.MakeWebGLCanvasSurface(canvas) ?? canvasKit.MakeSWCanvasSurface(canvas))
        : canvasKit.MakeSWCanvasSurface(canvas);
    if (!surface) {
      throw new Error("[react-canvas] Failed to create a CanvasKit surface for <canvas>.");
    }

    frameRef.current.surface = surface;
    frameRef.current.canvasKit = canvasKit;
    frameRef.current.width = width;
    frameRef.current.height = height;
    frameRef.current.dpr = dpr;

    const sceneRoot = new ViewNode(yoga, "View");
    sceneRoot.setStyle({ width: "100%", height: "100%" });
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

    return () => {
      reconciler.updateContainer(null, root, null, () => {});
      sceneRoot.destroy();
      reconcilerRef.current = null;
      rootRef.current = null;
      containerRef.current = null;
      surface.delete();
      frameRef.current.surface = null;
    };
  }, [yoga, canvasKit, width, height]);

  useLayoutEffect(() => {
    const reconciler = reconcilerRef.current;
    const root = rootRef.current;
    if (!reconciler || !root) return;
    reconciler.updateContainer(children, root as never, null, () => {});
  }, [children]);

  return <canvas ref={canvasRef} />;
}
