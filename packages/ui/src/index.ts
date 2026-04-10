/**
 * 占位包：使 workspace 可安装；完整 UI 实现可在后续迁入。
 * 导出形状需满足文档站与 Playground 的 import。
 */
import type { ViewStyle } from "@react-canvas/core";
import { createContext, createElement, useContext, type ReactNode } from "react";

export type SeedToken = {
  colorPrimary?: string;
  borderRadius?: number;
};

export type CanvasThemeConfig = {
  seed?: Partial<SeedToken>;
  appearance?: "light" | "dark";
  density?: "default" | "compact";
  components?: Record<string, unknown>;
};

/** 占位：宽松类型，避免文档站与 Playground 与 stub 冲突。 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
export type CanvasToken = any;

const TokenCtx = createContext<CanvasToken>({});

export function getCanvasToken(config: CanvasThemeConfig): CanvasToken {
  void config;
  return {};
}

export function mergeViewStyles(_base: ViewStyle, ..._rest: ViewStyle[]): ViewStyle {
  return {};
}

export function resolveSx(_token: CanvasToken, _sx: unknown): ViewStyle {
  return {};
}

export function CanvasThemeProvider({
  children,
  theme: _theme,
}: {
  children: ReactNode;
  theme?: CanvasThemeConfig;
}): ReactNode {
  return createElement(TokenCtx.Provider, { value: {} }, children);
}

export function useCanvasToken(): CanvasToken {
  return useContext(TokenCtx);
}

/** 占位组件：接受任意 props，避免文档站类型检查与真实实现不一致。 */
// oxlint-disable-next-line @typescript-eslint/no-explicit-any
const stub = (() => null) as any;

export const Avatar = stub;
export const AvatarGroup = stub;
export const Button = stub;
export const Checkbox = stub;
export const Divider = stub;
export const Icon = stub;
export const Loading = stub;
export const Select = stub;
export const Switch = stub;

export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
export type LoadingSize = "sm" | "md";
export type SelectSize = "sm" | "md";

export function getButtonStyles(_opts: unknown): ViewStyle {
  return {};
}

export function getLoadingMetrics(_size: LoadingSize): { width: number; height: number } {
  return { width: 16, height: 16 };
}

export function getSelectTriggerShellStyle(_opts: unknown): ViewStyle {
  return {};
}

export function getSelectPanelStyle(_opts: unknown): ViewStyle {
  return {};
}

export function getSelectOptionRowStyle(_opts: unknown): ViewStyle {
  return {};
}

export const selectFontSize = 14;
export const selectTriggerPadding = 8;
