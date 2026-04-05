import { mergeComponentMaps } from "./merge-token.ts";
import type { CanvasThemeConfig } from "./types.ts";

export function mergeThemeConfig(
  parent: CanvasThemeConfig,
  child: CanvasThemeConfig,
): CanvasThemeConfig {
  return {
    seed: { ...parent.seed, ...child.seed },
    appearance: child.appearance !== undefined ? child.appearance : parent.appearance,
    density: child.density !== undefined ? child.density : parent.density,
    components: mergeComponentMaps(parent.components, child.components),
  };
}
