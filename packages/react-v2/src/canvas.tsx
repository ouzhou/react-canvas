import type { SceneRuntime, TypefaceFontProvider } from "@react-canvas/core-v2";
import { createSceneRuntime } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ParentSceneIdContext, SceneRuntimeContext } from "./context.tsx";
import { SceneSkiaCanvas } from "./scene-skia-canvas.tsx";

export type CanvasProps = {
  width: number;
  height: number;
  children?: ReactNode;
  paragraphFontProvider?: TypefaceFontProvider | null;
  defaultParagraphFontFamily?: string;
};

/**
 * 画布场景：内部含 `<canvas />` 与场景上下文；子节点仅应使用 {@link View}（不产生 DOM）。
 */
export function Canvas(props: CanvasProps): ReactNode {
  const { width, height, children, paragraphFontProvider, defaultParagraphFontFamily } = props;
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
    <div style={{ position: "relative", width, height }}>
      <SceneSkiaCanvas
        runtime={runtime}
        width={width}
        height={height}
        paragraphFontProvider={paragraphFontProvider}
        defaultParagraphFontFamily={defaultParagraphFontFamily}
      />
      <SceneRuntimeContext.Provider value={runtime}>
        <ParentSceneIdContext.Provider value={runtime.getContentRootId()}>
          {children}
        </ParentSceneIdContext.Provider>
      </SceneRuntimeContext.Provider>
    </div>
  );
}
