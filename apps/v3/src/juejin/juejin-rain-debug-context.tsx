import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import {
  cloneJuejinRainDebugDefault,
  type JuejinRainDebugState,
} from "./juejin-rain-debug-defaults.ts";

type JuejinRainDebugContextValue = {
  state: JuejinRainDebugState;
  setState: React.Dispatch<React.SetStateAction<JuejinRainDebugState>>;
  /**供 getUniforms 等每帧读取最新值 */
  stateRef: React.MutableRefObject<JuejinRainDebugState>;
};

const JuejinRainDebugContext = createContext<JuejinRainDebugContextValue | null>(null);

export function JuejinRainDebugProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JuejinRainDebugState>(() => cloneJuejinRainDebugDefault());
  const stateRef = useRef(state);
  stateRef.current = state;
  const value = useMemo(
    () => ({
      state,
      setState,
      stateRef,
    }),
    [state],
  );
  return (
    <JuejinRainDebugContext.Provider value={value}>{children}</JuejinRainDebugContext.Provider>
  );
}

export function useJuejinRainDebug(): JuejinRainDebugContextValue {
  const ctx = useContext(JuejinRainDebugContext);
  if (!ctx) {
    throw new Error("useJuejinRainDebug must be used within JuejinRainDebugProvider");
  }
  return ctx;
}

export function useJuejinRainDebugOptional(): JuejinRainDebugContextValue | null {
  return useContext(JuejinRainDebugContext);
}
