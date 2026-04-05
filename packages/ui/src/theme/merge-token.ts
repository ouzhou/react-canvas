import type { CanvasToken, ComponentTokenMap } from "./types.ts";

export function mergeComponentMaps(
  a: ComponentTokenMap | undefined,
  b: ComponentTokenMap | undefined,
): ComponentTokenMap | undefined {
  if (!a && !b) {
    return undefined;
  }
  if (!a) {
    return b ? { ...b } : undefined;
  }
  if (!b) {
    return { ...a };
  }
  const out: ComponentTokenMap = { ...a };
  for (const key of Object.keys(b) as (keyof ComponentTokenMap)[]) {
    const bv = b[key];
    if (bv === undefined) {
      continue;
    }
    const av = a[key];
    out[key] = av ? { ...av, ...bv } : { ...bv };
  }
  return out;
}

/**
 * 合并两个 token；`components` 按 key 浅合并（Button 等为 Partial<CanvasToken>）。
 */
export function mergeCanvasToken(base: CanvasToken, patch: Partial<CanvasToken>): CanvasToken {
  const { components: patchComponents, ...patchRest } = patch;
  const merged: CanvasToken = {
    ...base,
    ...patchRest,
  };
  if (patchComponents !== undefined || base.components !== undefined) {
    merged.components = mergeComponentMaps(base.components, patchComponents);
  }
  return merged;
}
