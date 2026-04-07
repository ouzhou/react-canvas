import {
  queueLayoutPaintFrame,
  resetLayoutPaintQueue,
  ViewNode,
  type CanvasKit,
  type ViewportCamera,
  type Yoga,
} from "@react-canvas/core";
import {
  Children,
  isValidElement,
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import Reconciler from "react-reconciler";
import { canvasBackingStoreSize } from "./canvas-backing-store.ts";
import { registerCanvasFrame, unregisterCanvasFrame } from "./canvas-frame-registry.ts";
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
  /** 可选：与内部 `<canvas>` DOM 同步，便于 `attachViewportHandlers` 等扩展 */
  canvasRef?: RefObject<HTMLCanvasElement | null>;
  /** 画布根视口相机（平移 + 统一缩放）；缺省为无变换。与节点 `transform` 二选一，避免重复。 */
  camera?: ViewportCamera | null;
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

function layoutWH(width: number, height: number): { lw: number; lh: number } {
  return { lw: Math.max(1, Math.round(width)), lh: Math.max(1, Math.round(height)) };
}

export function Canvas({
  width,
  height,
  children,
  canvasRef: forwardedCanvasRef,
  camera = null,
}: CanvasProps) {
  assertSingleViewChild(children);
  const { yoga, canvasKit } = useCanvasRuntime();

  /** 拖拽等场景下父组件可能一帧内多次改宽高；延后提交以减少 WebGL surface 连续删建。 */
  const dw = useDeferredValue(width);
  const dh = useDeferredValue(height);
  const { lw, lh } = layoutWH(dw, dh);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const setCanvasNode = useCallback(
    (el: HTMLCanvasElement | null) => {
      canvasRef.current = el;
      if (forwardedCanvasRef) forwardedCanvasRef.current = el;
    },
    [forwardedCanvasRef],
  );
  const frameRef = useRef<PaintFrameRef>({
    surface: null,
    canvasKit: null,
    sceneRoot: null,
    width: 0,
    height: 0,
    dpr: 1,
    camera: null,
  });
  frameRef.current.camera = camera ?? null;

  const reconcilerRef = useRef<ReturnType<typeof Reconciler> | null>(null);
  const rootRef = useRef<unknown>(null);
  const containerRef = useRef<SceneContainer | null>(null);
  const detachPointerRef = useRef<(() => void) | null>(null);

  /** 与当前 surface 对应的布局键；用于仅在尺寸/运行时变化时重建，避免仅 children 变化时误拆 surface */
  const layoutKeyRef = useRef<{
    w: number;
    h: number;
    yoga: Yoga | null;
    canvasKit: CanvasKit | null;
  }>({ w: 0, h: 0, yoga: null, canvasKit: null });

  const destroySurface = (): void => {
    const canvasEl = canvasRef.current;
    if (canvasEl) unregisterCanvasFrame(canvasEl);

    const reconciler = reconcilerRef.current;
    const root = rootRef.current;
    const surface = frameRef.current.surface;
    const sceneRoot = frameRef.current.sceneRoot;

    if (!reconciler || !root || !surface || !sceneRoot) {
      detachPointerRef.current?.();
      detachPointerRef.current = null;
      reconcilerRef.current = null;
      rootRef.current = null;
      containerRef.current = null;
      frameRef.current.sceneRoot = null;
      if (surface) {
        resetLayoutPaintQueue(surface);
        surface.delete();
      }
      frameRef.current.surface = null;
      frameRef.current.canvasKit = null;
      frameRef.current.camera = null;
      layoutKeyRef.current = { w: 0, h: 0, yoga: null, canvasKit: null };
      return;
    }

    detachPointerRef.current?.();
    detachPointerRef.current = null;
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
    frameRef.current.camera = null;
    layoutKeyRef.current = { w: 0, h: 0, yoga: null, canvasKit: null };
  };

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const key = layoutKeyRef.current;
    const needNewSurface =
      reconcilerRef.current === null ||
      key.w !== lw ||
      key.h !== lh ||
      key.yoga !== yoga ||
      key.canvasKit !== canvasKit;

    if (needNewSurface) {
      destroySurface();

      const devicePixelRatio =
        typeof globalThis !== "undefined" && "devicePixelRatio" in globalThis
          ? ((globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1)
          : 1;

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

      layoutKeyRef.current = { w: lw, h: lh, yoga, canvasKit };

      detachPointerRef.current = attachCanvasPointerHandlers(
        canvas,
        sceneRoot,
        lw,
        lh,
        canvasKit,
        () => {
          const fr = frameRef.current;
          if (fr.surface && fr.canvasKit && fr.sceneRoot) {
            queueLayoutPaintFrame(
              fr.surface,
              fr.canvasKit,
              fr.sceneRoot,
              fr.width,
              fr.height,
              fr.dpr,
              fr.camera,
            );
          }
        },
        () => frameRef.current.camera,
      );
    }

    const reconciler = reconcilerRef.current;
    const root = rootRef.current;
    if (!reconciler || !root) return;

    reconciler.updateContainer(children, root as never, null, () => {});

    /** 供 `useCanvasClickAway` 等与 DOM canvas 关联的命中逻辑（逻辑坐标与 sceneRoot 同步）。 */
    const fr = frameRef.current;
    if (canvas && fr.surface && fr.sceneRoot && fr.canvasKit) {
      registerCanvasFrame(canvas, {
        sceneRoot: fr.sceneRoot,
        canvasKit: fr.canvasKit,
        logicalWidth: fr.width,
        logicalHeight: fr.height,
        camera: fr.camera,
      });
    }

    /** 与 host resetAfterCommit 内 queueLayoutPaintFrame 一致；若某次 commit 触发 resetAfterCommit 时 frameRef 尚无 surface 会漏排队，此处补一次（frame-queue 内会合并重复）。 */
    const sr = fr.sceneRoot;
    if (fr.surface && fr.canvasKit && sr) {
      queueLayoutPaintFrame(fr.surface, fr.canvasKit, sr, fr.width, fr.height, fr.dpr, fr.camera);
    }
  }, [yoga, canvasKit, lw, lh, children, camera]);

  useLayoutEffect(() => {
    return () => {
      destroySurface();
    };
  }, []);

  /**
   * 不在 `<canvas>` 上使用随尺寸变化的 `key`：改宽高由 `needNewSurface` 在同一 DOM 上删建 surface；换 DOM 易与快速
   * 连续提交交错。`useDeferredValue` 压低父组件传入尺寸的频率。`display:block` 避免 inline 画布与 flex 基线空隙。
   */
  return <canvas ref={setCanvasNode} style={{ display: "block" }} />;
}
