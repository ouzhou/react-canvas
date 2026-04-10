import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import type { CanvasKit, Surface } from "canvaskit-wasm";

vi.mock("../../src/render/paint.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../src/render/paint.ts")>();
  return { ...mod, paintScene: vi.fn() };
});

import { initYoga } from "../../src/layout/yoga.ts";
import { paintScene, ViewNode } from "../../src/index.ts";
import { resetLayoutPaintQueueForTests } from "../../src/runtime/frame-queue.ts";
import { Stage } from "../../src/stage/stage.ts";
import type { Runtime } from "../../src/runtime/runtime.ts";
import type { Yoga } from "../../src/layout/yoga.ts";

function fakeCanvas(): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    style: { width: "", height: "" },
  } as unknown as HTMLCanvasElement;
}

describe("Stage frame scheduling", () => {
  let yoga: Yoga;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  afterEach(() => {
    resetLayoutPaintQueueForTests();
    vi.mocked(paintScene).mockClear();
  });

  it("requestLayoutPaint uses the same queue as queueLayoutPaintFrame", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 10, height: 10 });

    const surface = {
      requestAnimationFrame(fn: (c: unknown) => void) {
        fn({});
        return 0;
      },
    } as unknown as Surface;

    const makeSW = vi.fn(() => surface);
    const ck = {
      MakeSWCanvasSurface: makeSW,
      MakeWebGLCanvasSurface: vi.fn(),
      Paint: class {
        setAntiAlias = vi.fn();
        delete = vi.fn();
      },
    } as unknown as CanvasKit;

    const runtime: Runtime = { yoga, canvasKit: ck };

    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 100, height: 80, dpr: 1 });
    expect(stage.getSurface()).toBe(surface);

    stage.requestLayoutPaint(root);
    expect(paintScene).toHaveBeenCalledTimes(1);
  });
});
