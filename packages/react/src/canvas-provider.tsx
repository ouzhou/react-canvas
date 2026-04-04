import { initCanvasRuntime, type CanvasKit, type Yoga } from "@react-canvas/core";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CanvasRuntimeContext } from "./context.ts";

export type CanvasProviderRenderState = {
  isReady: boolean;
  error: Error | null;
};

export type CanvasProviderProps = {
  children: (state: CanvasProviderRenderState) => ReactNode;
};

export function CanvasProvider({ children }: CanvasProviderProps) {
  const [yoga, setYoga] = useState<Yoga | null>(null);
  const [canvasKit, setCanvasKit] = useState<CanvasKit | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    void initCanvasRuntime()
      .then(({ yoga: y, canvasKit: ck }) => {
        if (cancelled) return;
        setYoga(y);
        setCanvasKit(ck);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isReady = yoga !== null && canvasKit !== null;
  const value = useMemo(() => (yoga && canvasKit ? { yoga, canvasKit } : null), [yoga, canvasKit]);

  return (
    <CanvasRuntimeContext.Provider value={value}>
      {children({ isReady, error })}
    </CanvasRuntimeContext.Provider>
  );
}
