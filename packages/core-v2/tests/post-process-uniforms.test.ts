import { expect, test } from "vite-plus/test";

import type { RuntimeEffect } from "canvaskit-wasm";

import { packPostProcessUniforms } from "../src/render/post-process-uniforms.ts";

function mockEffect(
  uniforms: Array<{
    name: string;
    meta: { columns: number; rows: number; slot: number; isInteger: boolean };
  }>,
  totalFloats: number,
): Pick<
  RuntimeEffect,
  "getUniformCount" | "getUniformFloatCount" | "getUniformName" | "getUniform"
> {
  return {
    getUniformCount: () => uniforms.length,
    getUniformFloatCount: () => totalFloats,
    getUniformName: (i: number) => uniforms[i]!.name,
    getUniform: (i: number) => uniforms[i]!.meta,
  };
}

test("packs floats by slot order (vec2 + float)", () => {
  const effect = mockEffect(
    [
      { name: "uA", meta: { columns: 2, rows: 1, slot: 0, isInteger: false } },
      { name: "uB", meta: { columns: 1, rows: 1, slot: 2, isInteger: false } },
    ],
    4,
  );
  const out = packPostProcessUniforms(effect, { uA: [1, 2], uB: 3 });
  expect(out).toEqual(new Float32Array([1, 2, 3, 0]));
});

test("missing keys stay zero", () => {
  const effect = mockEffect(
    [{ name: "uX", meta: { columns: 1, rows: 1, slot: 0, isInteger: false } }],
    1,
  );
  const out = packPostProcessUniforms(effect, {});
  expect(out).toEqual(new Float32Array([0]));
});
