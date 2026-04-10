import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
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

function minimalRuntime(yoga: Yoga): Runtime {
  const surface = { requestAnimationFrame: () => 0, delete: vi.fn() } as unknown as Surface;
  const ck = {
    MakeSWCanvasSurface: () => surface,
    MakeWebGLCanvasSurface: () => null,
    Paint: class {
      setAntiAlias = () => {};
      delete = () => {};
    },
  } as unknown as CanvasKit;
  return { yoga, canvasKit: ck };
}

describe("Ticker", () => {
  let yoga: Yoga;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs add callback each frame and remove on return true", () => {
    const runtime = minimalRuntime(yoga);
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 64, height: 64, dpr: 1 });
    const ticker = stage.createTicker();

    let pending: ((canvasArg: unknown) => void) | null = null;
    const surface = stage.getSurface()!;
    vi.spyOn(surface, "requestAnimationFrame").mockImplementation(((fn: (c: unknown) => void) => {
      pending = fn;
      return 1;
    }) as typeof surface.requestAnimationFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    const runs: number[] = [];
    ticker.add((_d, now) => {
      runs.push(now);
      return runs.length >= 2;
    });
    ticker.start();

    expect(pending).not.toBeNull();
    pending!({});
    expect(runs.length).toBe(1);

    pending!({});
    expect(runs.length).toBe(2);

    stage.destroy();
  });

  it("stop cancels pending frame and does not run further callbacks", () => {
    const runtime = minimalRuntime(yoga);
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 64, height: 64, dpr: 1 });
    const ticker = stage.createTicker();

    const surface = stage.getSurface()!;
    const raf = vi.fn((_fn: (c: unknown) => void) => {
      return 77;
    });
    vi.spyOn(surface, "requestAnimationFrame").mockImplementation(
      raf as unknown as typeof surface.requestAnimationFrame,
    );
    const cancel = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancel);

    let n = 0;
    ticker.add(() => {
      n++;
      return false;
    });
    ticker.start();
    expect(raf).toHaveBeenCalledTimes(1);

    ticker.stop();
    expect(cancel).toHaveBeenCalledWith(77);
    expect(n).toBe(0);

    stage.destroy();
  });

  it("Stage.destroy destroys tickers", () => {
    const runtime = minimalRuntime(yoga);
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 64, height: 64, dpr: 1 });
    const ticker = stage.createTicker();

    const surface = stage.getSurface()!;
    vi.spyOn(surface, "requestAnimationFrame").mockImplementation(
      (() => 99) as typeof surface.requestAnimationFrame,
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());

    ticker.add(() => false);
    ticker.start();
    stage.destroy();

    expect(ticker.running).toBe(false);
  });
});
