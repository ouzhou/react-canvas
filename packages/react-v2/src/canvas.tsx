import type {
  Camera,
  PresentFrameInfo,
  SceneRuntime,
  TypefaceFontProvider,
} from "@react-canvas/core-v2";
import { createSceneRuntime } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { ParentSceneIdContext, SceneRuntimeContext } from "./context.tsx";
import { SceneSkiaCanvas } from "./scene-skia-canvas.tsx";

export type CanvasProps = {
  width: number;
  height: number;
  children?: ReactNode;
  paragraphFontProvider?: TypefaceFontProvider | null;
  defaultParagraphFontFamily?: string;
  /** Skia 每帧绘制结束回调（见 {@link PresentFrameInfo}）。 */
  onPresentFrame?: (info: PresentFrameInfo) => void;
  /**
   * 受控相机。传入时每次变化会调用 `runtime.setCamera`。
   * 不传时相机由 runtime 内部管理（默认 1:1 无平移）。
   */
  camera?: Partial<Camera>;
  /** 相机变化时回调（外部可用于同步 React 状态）。 */
  onCameraChange?: (camera: Camera) => void;
  /** runtime 就绪（或销毁）时回调；可持有引用调用 panBy/zoomAt 等相机 API。 */
  onRuntimeReady?: (runtime: SceneRuntime | null) => void;
};

/**
 * 画布场景：内部含 `<canvas />` 与场景上下文；子节点仅应使用 {@link View}（不产生 DOM）。
 */
export function Canvas(props: CanvasProps): ReactNode {
  const {
    width,
    height,
    children,
    paragraphFontProvider,
    defaultParagraphFontFamily,
    onPresentFrame,
    camera,
    onCameraChange,
    onRuntimeReady,
  } = props;
  const [runtime, setRuntime] = useState<SceneRuntime | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;
  const onRuntimeReadyRef = useRef(onRuntimeReady);
  onRuntimeReadyRef.current = onRuntimeReady;

  useEffect(() => {
    let cancelled = false;
    setRuntime(null);
    setError(null);
    onRuntimeReadyRef.current?.(null);
    createSceneRuntime({ width, height })
      .then((rt: SceneRuntime) => {
        if (!cancelled) {
          setRuntime(rt);
          onRuntimeReadyRef.current?.(rt);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
      onRuntimeReadyRef.current?.(null);
    };
  }, [width, height]);

  // 同步受控 camera → runtime
  useEffect(() => {
    if (!runtime || !camera) return;
    runtime.setCamera(camera);
  }, [runtime, camera]);

  // 订阅 runtime 相机变化 → onCameraChange
  useEffect(() => {
    if (!runtime) return;
    return runtime.subscribeCamera((cam) => {
      onCameraChangeRef.current?.(cam);
    });
  }, [runtime]);

  if (error) {
    throw error;
  }
  if (!runtime) {
    return null;
  }

  return (
    <div style={{ position: "relative", width, height }}>
      <SceneSkiaCanvas
        runtime={runtime}
        width={width}
        height={height}
        paragraphFontProvider={paragraphFontProvider}
        defaultParagraphFontFamily={defaultParagraphFontFamily}
        onPresentFrame={onPresentFrame}
      />
      <SceneRuntimeContext.Provider value={runtime}>
        <ParentSceneIdContext.Provider value={runtime.getContentRootId()}>
          {children}
        </ParentSceneIdContext.Provider>
      </SceneRuntimeContext.Provider>
    </div>
  );
}
