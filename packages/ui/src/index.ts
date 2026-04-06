import "./types/augment.ts";

export { Avatar, type AvatarProps } from "./components/avatar/avatar.tsx";
export { Button, type ButtonProps } from "./components/button/button.tsx";
export { Checkbox, type CheckboxProps } from "./components/checkbox/checkbox.tsx";
export { Icon } from "./components/icon/icon.tsx";
export type { IconProps, LucideIconData } from "./components/icon/types.ts";
export {
  getAvatarContainerStyle,
  resolveAvatarPixelSize,
  type AvatarSizePreset,
} from "./components/avatar/variants.ts";
export {
  getButtonStyles,
  type ButtonSize,
  type ButtonVariant,
} from "./components/button/variants.ts";
export {
  getCheckboxCheckedStyles,
  getCheckboxStyles,
  type CheckboxSize,
} from "./components/checkbox/variants.ts";
export { Switch, type SwitchProps } from "./components/switch/switch.tsx";
export {
  getSwitchMetrics,
  getSwitchThumbOffset,
  getSwitchThumbStyle,
  getSwitchTrackStyle,
  type SwitchSize,
} from "./components/switch/variants.ts";
export { mergeViewStyles } from "./style/merge.ts";
export { resolveSx, type SxCanvas } from "./style/sx.ts";
export { compactAlgorithm, darkAlgorithm, defaultAlgorithm } from "./theme/algorithms.ts";
export { CanvasThemeContext, CanvasThemeProvider, useCanvasToken } from "./theme/context.tsx";
export type { CanvasThemeContextValue } from "./theme/context.tsx";
export { getCanvasToken } from "./theme/get-canvas-token.ts";
export { mergeThemeConfig } from "./theme/merge-config.ts";
export { mergeCanvasToken } from "./theme/merge-token.ts";
export { DEFAULT_SEED } from "./theme/seed.ts";
export type {
  Appearance,
  CanvasThemeConfig,
  CanvasToken,
  ComponentTokenMap,
  Density,
  SeedToken,
} from "./theme/types.ts";
