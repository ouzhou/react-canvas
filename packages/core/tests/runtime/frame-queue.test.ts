import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import type { CanvasKit, Surface } from "canvaskit-wasm";

vi.mock("../../src/render/paint.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../src/render/paint.ts")>();
  return { ...mod, paintScene: vi.fn() };
});

import { initYoga, paintScene, ViewNode } from "../../src/index.ts";
import {
  queueLayoutPaintFrame,
  queuePaintOnlyFrame,
  resetLayoutPaintQueueForTests,
} from "../../src/runtime/frame-queue.ts";

describe("queueLayoutPaintFrame", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  afterEach(() => {
    resetLayoutPaintQueueForTests();
    vi.mocked(paintScene).mockClear();
  });

  function minimalCanvasKit(): CanvasKit {
    return {
      Paint: class {
        setAntiAlias = vi.fn();
        delete = vi.fn();
      },
    } as unknown as CanvasKit;
  }

  it("schedules one frame, runs layout and paintScene", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 10, height: 10 });
    const spy = vi.spyOn(root, "calculateLayout");
    const surface = {
      requestAnimationFrame(fn: (c: unknown) => void) {
        fn({});
        return 0;
      },
    } as unknown as Surface;
    const ck = minimalCanvasKit();
    queueLayoutPaintFrame(surface, ck, root, 100, 80, 1);
    expect(spy).toHaveBeenCalledWith(100, 80, ck);
    expect(paintScene).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("coalesces a second queue before the pending frame runs", () => {
    const root = new ViewNode(yoga, "View");
    let pending: ((c: unknown) => void) | null = null;
    const raf = vi.fn((fn: (c: unknown) => void) => {
      pending = fn;
      return 1;
    });
    const surface = { requestAnimationFrame: raf } as unknown as Surface;
    const ck = minimalCanvasKit();
    queueLayoutPaintFrame(surface, ck, root, 10, 10, 1);
    queueLayoutPaintFrame(surface, ck, root, 99, 99, 1);
    expect(raf).toHaveBeenCalledTimes(1);
    pending!({});
    expect(paintScene).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending frame when resetLayoutPaintQueueForTests runs before the callback", () => {
    const root = new ViewNode(yoga, "View");
    const raf = vi.fn((_fn: (c: unknown) => void) => 42);
    const surface = { requestAnimationFrame: raf } as unknown as Surface;
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);

    queueLayoutPaintFrame(surface, minimalCanvasKit(), root, 10, 10, 1);
    resetLayoutPaintQueueForTests();
    expect(cancel).toHaveBeenCalledWith(42);
    expect(paintScene).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });

  it("allows two different surfaces to queue independently (no global coalescing)", () => {
    const rootA = new ViewNode(yoga, "View");
    const rootB = new ViewNode(yoga, "View");
    rootA.setStyle({ width: 10, height: 10 });
    rootB.setStyle({ width: 10, height: 10 });
    let pendingA: ((c: unknown) => void) | null = null;
    let pendingB: ((c: unknown) => void) | null = null;
    const rafA = vi.fn((fn: (c: unknown) => void) => {
      pendingA = fn;
      return 1;
    });
    const rafB = vi.fn((fn: (c: unknown) => void) => {
      pendingB = fn;
      return 2;
    });
    const surfaceA = { requestAnimationFrame: rafA } as unknown as Surface;
    const surfaceB = { requestAnimationFrame: rafB } as unknown as Surface;
    const ck = minimalCanvasKit();
    queueLayoutPaintFrame(surfaceA, ck, rootA, 10, 10, 1);
    queueLayoutPaintFrame(surfaceB, ck, rootB, 20, 20, 1);
    expect(rafA).toHaveBeenCalledTimes(1);
    expect(rafB).toHaveBeenCalledTimes(1);
    pendingA!({});
    pendingB!({});
    expect(paintScene).toHaveBeenCalledTimes(2);
  });

  it("queuePaintOnlyFrame paints without calculateLayout", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 10, height: 10 });
    const spy = vi.spyOn(root, "calculateLayout");
    const surface = {
      requestAnimationFrame(fn: (c: unknown) => void) {
        fn({});
        return 0;
      },
    } as unknown as Surface;
    const ck = minimalCanvasKit();
    queuePaintOnlyFrame(surface, ck, root, 100, 80, 1);
    expect(spy).not.toHaveBeenCalled();
    expect(paintScene).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("queueLayoutPaintFrame after queuePaintOnlyFrame upgrades the same rAF to layout+paint", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 10, height: 10 });
    const spy = vi.spyOn(root, "calculateLayout");
    let pending: ((c: unknown) => void) | null = null;
    const raf = vi.fn((fn: (c: unknown) => void) => {
      pending = fn;
      return 1;
    });
    const surface = { requestAnimationFrame: raf } as unknown as Surface;
    const ck = minimalCanvasKit();
    queuePaintOnlyFrame(surface, ck, root, 10, 10, 1);
    queueLayoutPaintFrame(surface, ck, root, 99, 99, 1);
    expect(raf).toHaveBeenCalledTimes(1);
    pending!({});
    expect(spy).toHaveBeenCalledWith(99, 99, ck);
    expect(paintScene).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("can queue again after the frame callback runs", () => {
    const root = new ViewNode(yoga, "View");
    const raf = vi.fn((fn: (c: unknown) => void) => {
      fn({});
      return 0;
    });
    const surface = { requestAnimationFrame: raf } as unknown as Surface;
    const ck = minimalCanvasKit();
    queueLayoutPaintFrame(surface, ck, root, 10, 10, 1);
    expect(raf).toHaveBeenCalledTimes(1);
    vi.mocked(paintScene).mockClear();
    queueLayoutPaintFrame(surface, ck, root, 20, 20, 1);
    expect(raf).toHaveBeenCalledTimes(2);
    expect(paintScene).toHaveBeenCalledTimes(1);
  });
});
