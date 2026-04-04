import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import type { CanvasKit, Surface } from "@react-canvas/core";

vi.mock("@react-canvas/core", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@react-canvas/core")>();
  return { ...mod, paintScene: vi.fn() };
});

import { initYoga, paintScene, ViewNode } from "@react-canvas/core";
import {
  queueLayoutPaintFrame,
  resetLayoutPaintQueueForTests,
} from "../src/queue-layout-paint-frame.ts";

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
    queueLayoutPaintFrame(surface, minimalCanvasKit(), root, 100, 80, 1);
    expect(spy).toHaveBeenCalledWith(100, 80);
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
