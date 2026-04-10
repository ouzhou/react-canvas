import { describe, expect, test, vi } from "vite-plus/test";
import type { CanvasKit, Surface } from "canvaskit-wasm";

import { initYoga } from "../../src/layout/yoga.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";
import { Stage } from "../../src/stage/stage.ts";
import type { Runtime } from "../../src/runtime/runtime.ts";

function fakeCanvas(): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    style: { width: "", height: "" },
  } as unknown as HTMLCanvasElement;
}

describe("Stage pointer capture", () => {
  test("setPointerCapture / releasePointerCapture / getPointerCaptureTarget", async () => {
    const yoga: Yoga = await initYoga();
    const surface = { requestAnimationFrame: () => 0, delete: vi.fn() } as unknown as Surface;
    const ck = {
      MakeSWCanvasSurface: () => surface,
      MakeWebGLCanvasSurface: () => null,
      Paint: class {
        setAntiAlias = () => {};
        delete = () => {};
      },
    } as unknown as CanvasKit;
    const runtime: Runtime = { yoga, canvasKit: ck };

    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 32, height: 32, dpr: 1 });
    const a = new ViewNode(yoga, "View");
    const b = new ViewNode(yoga, "View");

    stage.setPointerCapture(a, 5);
    expect(stage.getPointerCaptureTarget(5)).toBe(a);

    stage.releasePointerCapture(b, 5);
    expect(stage.getPointerCaptureTarget(5)).toBe(a);

    stage.releasePointerCapture(a, 5);
    expect(stage.getPointerCaptureTarget(5)).toBeUndefined();

    stage.setPointerCapture(a, 1);
    stage.destroy();
    expect(stage.getPointerCaptureTarget(1)).toBeUndefined();
  });
});
