import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getCanvasToken } from "./get-canvas-token.ts";
import { mergeThemeConfig } from "./merge-config.ts";
import type { CanvasThemeConfig, CanvasToken } from "./types.ts";

export type CanvasThemeContextValue = {
  config: CanvasThemeConfig;
  token: CanvasToken;
};

export const CanvasThemeContext = createContext<CanvasThemeContextValue | null>(null);

export function CanvasThemeProvider({
  theme,
  children,
}: {
  theme: CanvasThemeConfig;
  children: ReactNode;
}) {
  const parent = useContext(CanvasThemeContext);
  const parentConfig = parent?.config;
  const mergedConfig = useMemo(() => {
    if (parentConfig === undefined) {
      return theme;
    }
    return mergeThemeConfig(parentConfig, theme);
  }, [parentConfig, theme]);

  const token = useMemo(() => getCanvasToken(mergedConfig), [mergedConfig]);

  const value = useMemo(
    (): CanvasThemeContextValue => ({
      config: mergedConfig,
      token,
    }),
    [mergedConfig, token],
  );

  return <CanvasThemeContext.Provider value={value}>{children}</CanvasThemeContext.Provider>;
}

export function useCanvasToken(): CanvasToken {
  const ctx = useContext(CanvasThemeContext);
  if (!ctx) {
    throw new Error("useCanvasToken must be used within CanvasThemeProvider");
  }
  return ctx.token;
}
