import type { CanvasKit, Yoga } from "@react-canvas/core";
import { createContext, useContext } from "react";

export type CanvasRuntimeValue = {
  yoga: Yoga;
  canvasKit: CanvasKit;
};

export const CanvasRuntimeContext = createContext<CanvasRuntimeValue | null>(null);

export function useCanvasRuntime(): CanvasRuntimeValue {
  const v = useContext(CanvasRuntimeContext);
  if (!v) {
    throw new Error(
      "[react-canvas] R-ROOT-1: useCanvasRuntime() requires an ancestor <CanvasProvider> with a successful Yoga and CanvasKit load.",
    );
  }
  return v;
}
