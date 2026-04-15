/**
 * 校验与 presenter 一致的最小 pass-through SkSL 能被 CanvasKit 编译（需 bin/canvaskit.wasm）。
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CanvasKit, CanvasKitInitOptions } from "canvaskit-wasm";
import { afterAll, beforeAll, expect, test } from "vite-plus/test";

const canvaskitBinDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../node_modules/canvaskit-wasm/bin",
);

async function loadRealCanvasKit(): Promise<CanvasKit> {
  const CanvasKitInit = (await import("canvaskit-wasm")).default as unknown as (
    opts?: CanvasKitInitOptions,
  ) => Promise<CanvasKit>;
  return CanvasKitInit({
    locateFile: (file: string) => join(canvaskitBinDir, file),
  });
}

let ck: CanvasKit | null = null;

beforeAll(async () => {
  ck = await loadRealCanvasKit();
}, 60_000);

afterAll(() => {
  ck = null;
});

const PASS_THROUGH_SKSL = `uniform shader uScene;
half4 main(float2 p) {
    return uScene.eval(p);
}`;

test("RuntimeEffect.Make accepts minimal pass-through SkSL", () => {
  expect(ck).not.toBeNull();
  const eff = ck!.RuntimeEffect.Make(PASS_THROUGH_SKSL, (err) => {
    throw new Error(err);
  });
  expect(eff).not.toBeNull();
  eff?.delete();
});
