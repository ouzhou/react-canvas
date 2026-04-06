import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

/**
 * 无 Provider 时（例如单测）使用的模块级后备分配器；与旧 `@react-canvas/ui` 行为一致。
 * 有 `CanvasProvider` 时应使用 Provider 内 `useRef`，避免多实例共用同一序列。
 */
let fallbackSeq = 1000;

export function allocateOverlayZIndex(): number {
  fallbackSeq += 1;
  return fallbackSeq;
}

const OverlayZIndexContext = createContext<(() => number) | null>(null);

/**
 * 浮层「最后打开在上」：每次调用返回递增整数，供 `style.zIndex` 使用。
 * 在 **`CanvasProvider` 内**时与**该 Provider 实例**绑定；否则回退到模块级 `allocateOverlayZIndex`。
 */
export function useAllocateOverlayZIndex(): () => number {
  const ctx = useContext(OverlayZIndexContext);
  return ctx ?? allocateOverlayZIndex;
}

/** 每个 `CanvasProvider` 内一份计数器，多画布 / 多 Provider 互不抢号。 */
export function OverlayZIndexProvider({ children }: { children: ReactNode }) {
  const seqRef = useRef(1000);
  const allocate = useCallback((): number => {
    seqRef.current += 1;
    return seqRef.current;
  }, []);
  const value = useMemo(() => allocate, [allocate]);
  return <OverlayZIndexContext.Provider value={value}>{children}</OverlayZIndexContext.Provider>;
}
