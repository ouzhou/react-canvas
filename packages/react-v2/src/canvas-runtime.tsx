import type { SceneRuntime } from "@react-canvas/core-v2";
import { createSceneRuntime } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ParentSceneIdContext, SceneRuntimeContext } from "./context.tsx";

export type CanvasRuntimeProps = {
  width: number;
  height: number;
  children?: ReactNode;
};

export function CanvasRuntime(props: CanvasRuntimeProps): ReactNode {
  const { width, height, children } = props;
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

  return (
    <SceneRuntimeContext.Provider value={runtime}>
      <ParentSceneIdContext.Provider value={runtime.getRootId()}>
        {children}
      </ParentSceneIdContext.Provider>
    </SceneRuntimeContext.Provider>
  );
}
