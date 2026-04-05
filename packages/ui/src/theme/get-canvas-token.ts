import { compactAlgorithm, darkAlgorithm, defaultAlgorithm } from "./algorithms.ts";
import { DEFAULT_SEED } from "./seed.ts";
import { mergeCanvasToken } from "./merge-token.ts";
import type { CanvasThemeConfig, CanvasToken, SeedToken } from "./types.ts";

function resolveSeed(config: CanvasThemeConfig): SeedToken {
  return {
    ...DEFAULT_SEED,
    ...config.seed,
  };
}

export function getCanvasToken(config: CanvasThemeConfig): CanvasToken {
  const mergedSeed = resolveSeed(config);
  let token = defaultAlgorithm(mergedSeed);

  const density = config.density ?? "default";
  if (density === "compact") {
    token = mergeCanvasToken(token, compactAlgorithm(token));
  }

  const appearance = config.appearance ?? "light";
  if (appearance === "dark") {
    token = mergeCanvasToken(token, darkAlgorithm(token));
  }

  if (config.components) {
    token = mergeCanvasToken(token, { components: config.components });
  }

  return token;
}
