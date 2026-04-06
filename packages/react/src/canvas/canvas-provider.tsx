import {
  getCanvasRuntimeInitServerSnapshot,
  getCanvasRuntimeInitSnapshot,
  initCanvasRuntime,
  subscribeCanvasRuntimeInit,
  type InitCanvasRuntimeOptions,
} from "@react-canvas/core";
import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { CanvasRuntimeContext } from "./context.ts";
import { OverlayZIndexProvider } from "./overlay-z-index.tsx";

export type CanvasProviderRenderState = {
  isReady: boolean;
  error: Error | null;
};

export type CanvasProviderProps = {
  children: (state: CanvasProviderRenderState) => ReactNode;
  /** Passed to `initCanvasRuntime` (e.g. `loadDefaultParagraphFonts: false` in tests). */
  runtimeOptions?: InitCanvasRuntimeOptions;
};

export function CanvasProvider({ children, runtimeOptions }: CanvasProviderProps) {
  const loadDefaultParagraphFonts = runtimeOptions?.loadDefaultParagraphFonts !== false;
  const defaultParagraphFontUrl = runtimeOptions?.defaultParagraphFontUrl;

  useEffect(() => {
    void initCanvasRuntime({
      loadDefaultParagraphFonts: loadDefaultParagraphFonts,
      defaultParagraphFontUrl: defaultParagraphFontUrl,
    });
  }, [loadDefaultParagraphFonts, defaultParagraphFontUrl]);

  const snap = useSyncExternalStore(
    subscribeCanvasRuntimeInit,
    getCanvasRuntimeInitSnapshot,
    getCanvasRuntimeInitServerSnapshot,
  );

  const isReady = snap.status === "ready";
  const error = snap.status === "error" ? snap.error : null;

  const value = useMemo(() => {
    if (snap.status !== "ready") return null;
    return { yoga: snap.runtime.yoga, canvasKit: snap.runtime.canvasKit };
  }, [snap]);

  return (
    <CanvasRuntimeContext.Provider value={value}>
      <OverlayZIndexProvider>{children({ isReady, error })}</OverlayZIndexProvider>
    </CanvasRuntimeContext.Provider>
  );
}
