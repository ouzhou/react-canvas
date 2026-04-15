import type { RuntimeEffect, SkSLUniform } from "canvaskit-wasm";

/** 每帧可调数值；键为 SkSL 中 `uniform` 名。 */
export type PostProcessUniforms = Record<string, number | Float32Array | readonly number[]>;

/**
 * 将命名 uniform 映射为 `RuntimeEffect.makeShader*` 所需的扁平 `Float32Array`。
 * 布局与 `effect.getUniform(i)` 的 `slot` / `columns` / `rows` 一致；缺失的 uniform 填 0。
 * 当前仅处理 `isInteger === false` 的项（浮点）；整型 uniform 填 0（可后续扩展）。
 */
export function packPostProcessUniforms(
  effect: Pick<
    RuntimeEffect,
    "getUniformCount" | "getUniformFloatCount" | "getUniformName" | "getUniform"
  >,
  uniforms: PostProcessUniforms,
): Float32Array {
  const total = effect.getUniformFloatCount();
  const out = new Float32Array(total);

  const count = effect.getUniformCount();
  for (let i = 0; i < count; i++) {
    const meta = effect.getUniform(i);
    const name = effect.getUniformName(i);
    if (meta.isInteger) {
      continue;
    }
    const n = floatCountForUniform(meta);
    writeUniformSlice(out, meta.slot, n, uniforms[name]);
  }

  return out;
}

function floatCountForUniform(meta: SkSLUniform): number {
  return meta.columns * meta.rows;
}

function writeUniformSlice(
  out: Float32Array,
  slot: number,
  n: number,
  value: PostProcessUniforms[string] | undefined,
): void {
  if (value === undefined) {
    return;
  }
  if (typeof value === "number") {
    if (n >= 1) out[slot] = value;
    return;
  }
  if (value instanceof Float32Array) {
    for (let j = 0; j < n && j < value.length; j++) {
      out[slot + j] = value[j]!;
    }
    return;
  }
  const arr = value as readonly number[];
  for (let j = 0; j < n && j < arr.length; j++) {
    out[slot + j] = arr[j]!;
  }
}
