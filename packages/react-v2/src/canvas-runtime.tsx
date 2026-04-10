import type { SceneRuntime } from "@react-canvas/core-v2";
import { createSceneRuntime } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ParentSceneIdContext, SceneRuntimeContext } from "./context.tsx";
import { DebugDomLayer } from "./debug-dom-layer.tsx";
import { StagePointerSurface } from "./stage-pointer-surface.tsx";

export type CanvasRuntimeProps = {
  width: number;
  height: number;
  /** 为 true 时用定宽容器包裹并叠 DOM 调试层（框线 + 节点 id）。 */
  debugOverlay?: boolean;
  /**
   * 是否挂载透明 DOM 指针层（`StagePointerSurface`），将 `PointerEvent` 映射为 `dispatchPointerLike`。
   * 默认与 `debugOverlay` 一致。接入 Skia 时置 `false`，在 `<canvas>` 上用 `clientToStageLocal` 自行转发。
   */
  pointerBridge?: boolean;
  children?: ReactNode;
};

export function CanvasRuntime(props: CanvasRuntimeProps): ReactNode {
  const { width, height, debugOverlay, pointerBridge, children } = props;
  const pointerBridgeEnabled = pointerBridge ?? debugOverlay ?? false;
  const useStageWrapper = Boolean(debugOverlay || pointerBridgeEnabled);
  const [runtime, setRuntime] = useState<SceneRuntime | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRuntime(null);
    setError(null);
    createSceneRuntime({ width, height })
      .then((rt: SceneRuntime) => {
        if (!cancelled) setRuntime(rt);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, [width, height]);

  if (error) {
    throw error;
  }
  if (!runtime) {
    return null;
  }

  const tree = (
    <SceneRuntimeContext.Provider value={runtime}>
      <ParentSceneIdContext.Provider value={runtime.getRootId()}>
        {children}
      </ParentSceneIdContext.Provider>
    </SceneRuntimeContext.Provider>
  );

  if (useStageWrapper) {
    return (
      <div style={{ position: "relative", width, height }}>
        <StagePointerSurface runtime={runtime} enabled={pointerBridgeEnabled} />
        {tree}
        {debugOverlay ? <DebugDomLayer runtime={runtime} /> : null}
      </div>
    );
  }

  return tree;
}
