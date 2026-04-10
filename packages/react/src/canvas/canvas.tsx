import {
  Stage,
  resetLayoutPaintQueue,
  type CanvasKit,
  type Runtime,
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
import { registerCanvasFrame, unregisterCanvasFrame } from "./canvas-frame-registry.ts";
import { useCanvasRuntime } from "./context.ts";
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
  /**
   * `Stage` 创建后回调（每套 Surface 一次）。可用于 demo / 调试中注册 `Plugin`、`createTicker` 等；
   * 勿在业务中依赖其调用时机细节。
   */
  onStageReady?: (stage: InstanceType<typeof Stage>) => void;
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
  onStageReady,
}: CanvasProps) {
  assertSingleViewChild(children);
  const { yoga, canvasKit } = useCanvasRuntime();
  const onStageReadyRef = useRef(onStageReady);
  onStageReadyRef.current = onStageReady;

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
    stage: null,
  });
  frameRef.current.camera = camera ?? null;

  const reconcilerRef = useRef<ReturnType<typeof Reconciler> | null>(null);
  const rootRef = useRef<unknown>(null);
  const containerRef = useRef<SceneContainer | null>(null);
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
    const stage = frameRef.current.stage;

    if (reconciler && root) {
      reconciler.updateContainer(null, root, null, () => {});
    }
    reconcilerRef.current = null;
    rootRef.current = null;
    containerRef.current = null;
    frameRef.current.sceneRoot = null;

    if (stage) {
      stage.destroy();
    } else {
      const surface = frameRef.current.surface;
      if (surface) {
        resetLayoutPaintQueue(surface);
        surface.delete();
      }
    }

    frameRef.current.surface = null;
    frameRef.current.canvasKit = null;
    frameRef.current.stage = null;
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

      const runtime: Runtime = { yoga, canvasKit };
      const stage = new Stage(runtime, { canvas, width: lw, height: lh });

      frameRef.current.surface = stage.getSurface();
      frameRef.current.canvasKit = canvasKit;
      frameRef.current.sceneRoot = stage.defaultLayer.root;
      frameRef.current.width = stage.width;
      frameRef.current.height = stage.height;
      frameRef.current.dpr = stage.dpr;
      frameRef.current.stage = stage;

      const container: SceneContainer = { sceneRoot: stage.defaultLayer.root };
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

      stage.attachPointerHandlers(undefined, () => frameRef.current.camera);

      onStageReadyRef.current?.(stage);
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

    /** 与 host resetAfterCommit 内 requestLayoutPaint 一致；若某次 commit 触发 resetAfterCommit 时 frameRef 尚无 stage 会漏排队，此处补一次（帧队列内会合并重复）。 */
    if (fr.stage) {
      fr.stage.requestLayoutPaint();
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
