import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import type { CanvasKit, Surface } from "canvaskit-wasm";

vi.mock("../../src/render/paint.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../src/render/paint.ts")>();
  return { ...mod, paintScene: vi.fn() };
});

import { initYoga } from "../../src/layout/yoga.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import { paintScene, ViewNode } from "../../src/index.ts";
import { resetLayoutPaintQueueForTests } from "../../src/runtime/frame-queue.ts";
import { Stage } from "../../src/stage/stage.ts";
import type { Runtime } from "../../src/runtime/runtime.ts";

function fakeCanvas(): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    style: { width: "", height: "" },
  } as unknown as HTMLCanvasElement;
}

describe("Stage defaultLayer", () => {
  let yoga: Yoga;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  afterEach(() => {
    resetLayoutPaintQueueForTests();
    vi.mocked(paintScene).mockClear();
  });

  it("exposes full-size root and accepts children", () => {
    const surface = {
      delete: vi.fn(),
      requestAnimationFrame(fn: (c: unknown) => void) {
        fn({});
        return 0;
      },
    } as unknown as Surface;

    const ck = {
      MakeSWCanvasSurface: vi.fn(() => surface),
      MakeWebGLCanvasSurface: vi.fn(),
      Paint: class {
        setAntiAlias = vi.fn();
        delete = vi.fn();
      },
    } as unknown as CanvasKit;

    const runtime: Runtime = { yoga, canvasKit: ck };
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 320, height: 240, dpr: 1 });

    expect(stage.defaultLayer.zIndex).toBe(0);
    expect(stage.defaultLayer.root.parent).toBeNull();

    const child = new ViewNode(yoga, "View");
    child.setStyle({ width: 10, height: 10 });
    stage.defaultLayer.add(child);
    expect(stage.defaultLayer.root.children).toContain(child);

    stage.requestLayoutPaint();
    expect(paintScene).toHaveBeenCalledTimes(1);
    const firstCall = vi.mocked(paintScene).mock.calls[0];
    expect(firstCall?.[0]).toBe(stage.defaultLayer.root);

    stage.defaultLayer.remove(child);
    expect(stage.defaultLayer.root.children).toHaveLength(0);
    child.destroy();
    stage.destroy();
  });
});
