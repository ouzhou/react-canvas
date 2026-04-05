/**
 * 应用可通过 declare module 合并扩充 CanvasToken（见 types/augment.ts）。
 */
export interface SeedToken {
  colorPrimary: string;
  borderRadius: number;
}

export interface CanvasToken {
  colorPrimary: string;
  colorBgLayout: string;
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
