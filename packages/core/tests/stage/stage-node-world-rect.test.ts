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

describe("Stage.getNodeWorldRect", () => {
  test("returns logical rect relative to layer root", async () => {
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

    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 200, height: 200, dpr: 1 });
    const root = stage.defaultLayer.root;
    const child = new ViewNode(yoga, "View");
    root.appendChild(child);
    child.layout = { left: 12, top: 34, width: 56, height: 78 };

    expect(stage.getNodeWorldRect(child)).toEqual({
      x: 12,
      y: 34,
      width: 56,
      height: 78,
    });
  });
});
