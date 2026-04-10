import type { SceneRuntime } from "@react-canvas/core-v2";
import { createSceneRuntime } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ParentSceneIdContext, SceneRuntimeContext } from "./context.tsx";
import { DebugDomLayer } from "./debug-dom-layer.tsx";

export type CanvasRuntimeProps = {
  width: number;
  height: number;
  /** 为 true 时用定宽容器包裹并叠 DOM 调试层（框线 + 节点 id）。 */
  debugOverlay?: boolean;
  children?: ReactNode;
};

export function CanvasRuntime(props: CanvasRuntimeProps): ReactNode {
  const { width, height, debugOverlay, children } = props;
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

  if (debugOverlay) {
    return (
      <div style={{ position: "relative", width, height }}>
        {tree}
        <DebugDomLayer runtime={runtime} />
      </div>
    );
  }

  return tree;
}
