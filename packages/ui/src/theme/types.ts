/**
 * 应用可通过 declare module 合并扩充 CanvasToken（见 types/augment.ts）。
 */
export interface SeedToken {
  colorPrimary: string;
  borderRadius: number;
}

export interface CanvasToken {
  colorPrimary: string;
  /** 主按钮悬停背景：比 `colorPrimary` 更浅（向白色混合）。 */
  colorPrimaryHover: string;
  colorBgLayout: string;
  /** 弱背景悬停（如 ghost 按钮）：比 `colorBgLayout` 略浅或略提亮。 */
  colorBgHover: string;
  colorText: string;
  colorBorder: string;
  borderRadius: number;
  paddingSM: number;
  paddingMD: number;
  fontSizeSM: number;
  fontSizeMD: number;
  components?: ComponentTokenMap;
}

export interface ComponentTokenMap {
  Button?: Partial<CanvasToken>;
}

export type Appearance = "light" | "dark";

export type Density = "default" | "compact";

export interface CanvasThemeConfig {
  seed?: Partial<SeedToken>;
  appearance?: Appearance;
  density?: Density;
  components?: ComponentTokenMap;
}
