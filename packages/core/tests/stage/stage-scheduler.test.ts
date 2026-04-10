import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import type { CanvasKit, Surface } from "canvaskit-wasm";

vi.mock("../../src/render/paint.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../src/render/paint.ts")>();
  return { ...mod, paintScene: vi.fn() };
});

import { initYoga } from "../../src/layout/yoga.ts";
import { paintScene, ViewNode } from "../../src/index.ts";
import {
  peekSchedulerForSurface,
  resetLayoutPaintQueueForTests,
} from "../../src/runtime/frame-queue.ts";
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

describe("Stage FrameScheduler ownership", () => {
  let yoga: Yoga;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  afterEach(() => {
    resetLayoutPaintQueueForTests();
    vi.mocked(paintScene).mockClear();
  });

  it("Stage.getFrameScheduler matches WeakMap registration for the same Surface", () => {
    const surface = {
      requestAnimationFrame: vi.fn((fn: (c: unknown) => void) => {
        fn({});
        return 0;
      }),
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
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 32, height: 32, dpr: 1 });

    expect(stage.getSurface()).toBe(surface);
    const sch = stage.getFrameScheduler();
    expect(sch).not.toBeNull();
    expect(peekSchedulerForSurface(surface)).toBe(sch);
  });

  it("destroy resets queue so pending rAF does not run paintScene", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 10, height: 10 });

    const raf = vi.fn((_fn: (c: unknown) => void) => 42);
    const surface = { requestAnimationFrame: raf, delete: vi.fn() } as unknown as Surface;
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);

    const ck = {
      MakeSWCanvasSurface: vi.fn(() => surface),
      MakeWebGLCanvasSurface: vi.fn(),
      Paint: class {
        setAntiAlias = vi.fn();
        delete = vi.fn();
      },
    } as unknown as CanvasKit;

    const runtime: Runtime = { yoga, canvasKit: ck };
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 32, height: 32, dpr: 1 });

    stage.requestLayoutPaint(root);
    stage.destroy();

    expect(cancel).toHaveBeenCalledWith(42);
    expect(paintScene).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
