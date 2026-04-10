import { beforeAll, describe, expect, it } from "vite-plus/test";
import type { CanvasKit, Surface } from "canvaskit-wasm";

import { initYoga } from "../../src/layout/yoga.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import { Stage } from "../../src/stage/stage.ts";
import type { Runtime } from "../../src/runtime/runtime.ts";

function fakeCanvas(): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    style: { width: "", height: "" },
  } as unknown as HTMLCanvasElement;
}

describe("Stage layer order", () => {
  let yoga: Yoga;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("layersInPaintOrder sorts by zIndex ascending", () => {
    const surface = {
      delete: () => {},
      requestAnimationFrame: () => 0,
    } as unknown as Surface;
    const ck = {
      MakeSWCanvasSurface: () => surface,
      MakeWebGLCanvasSurface: () => null,
      Paint: class {},
    } as unknown as CanvasKit;
    const runtime: Runtime = { yoga, canvasKit: ck };
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 100, height: 100, dpr: 1 });

    const ordered = stage.layersInPaintOrder();
    expect(ordered.map((l) => l.zIndex)).toEqual([0, 100, 1000]);
    expect(ordered[0]).toBe(stage.defaultLayer);
    expect(ordered[1]).toBe(stage.overlayLayer);
    expect(ordered[2]).toBe(stage.modalLayer);

    stage.destroy();
  });
});
