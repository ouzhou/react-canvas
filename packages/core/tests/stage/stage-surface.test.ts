import { describe, expect, test, vi } from "vite-plus/test";
import type { CanvasKit, Surface } from "canvaskit-wasm";

import type { Yoga } from "../../src/layout/yoga.ts";
import { Stage } from "../../src/stage/stage.ts";
import type { Runtime } from "../../src/runtime/runtime.ts";

function fakeCanvas(): HTMLCanvasElement {
  const el = {
    width: 0,
    height: 0,
    style: {
      width: "",
      height: "",
    } as CSSStyleDeclaration,
  };
  return el as unknown as HTMLCanvasElement;
}

describe("Stage", () => {
  test("creates surface and applies backing store; destroy deletes surface", () => {
    const deleteFn = vi.fn();
    const mockSurface = {
      delete: deleteFn,
      requestAnimationFrame: vi.fn(),
    } as unknown as Surface;

    const makeSW = vi.fn(() => mockSurface);
    const ck = {
      MakeSWCanvasSurface: makeSW,
      MakeWebGLCanvasSurface: vi.fn(),
      Paint: class {
        setAntiAlias = vi.fn();
        delete = vi.fn();
      },
    } as unknown as CanvasKit;

    const runtime: Runtime = {
      yoga: {} as Yoga,
      canvasKit: ck,
    };

    const canvas = fakeCanvas();
    const stage = new Stage(runtime, { canvas, width: 400, height: 300, dpr: 2 });

    expect(makeSW).toHaveBeenCalledTimes(1);
    expect(stage.getSurface()).toBe(mockSurface);
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBeGreaterThan(0);
    expect(stage.width).toBe(400);
    expect(stage.height).toBe(300);

    stage.destroy();
    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(stage.getSurface()).toBeNull();
  });

  test("resize tears down previous surface and allocates a new one", () => {
    const surfaces: { delete: ReturnType<typeof vi.fn> }[] = [];
    const makeSW = vi.fn((): Surface => {
      const del = vi.fn();
      surfaces.push({ delete: del });
      return {
        delete: del,
        requestAnimationFrame: vi.fn(),
      } as unknown as Surface;
    });
    const ck = {
      MakeSWCanvasSurface: makeSW,
      MakeWebGLCanvasSurface: vi.fn(),
      Paint: class {
        setAntiAlias = vi.fn();
        delete = vi.fn();
      },
    } as unknown as CanvasKit;

    const runtime: Runtime = {
      yoga: {} as Yoga,
      canvasKit: ck,
    };

    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 100, height: 100, dpr: 1 });
    expect(makeSW).toHaveBeenCalledTimes(1);
    stage.resize(200, 200, 1);
    expect(makeSW).toHaveBeenCalledTimes(2);
    expect(surfaces[0]?.delete).toHaveBeenCalledTimes(1);
    expect(stage.width).toBe(200);
    expect(stage.height).toBe(200);
    stage.destroy();
    expect(surfaces[1]?.delete).toHaveBeenCalledTimes(1);
  });
});
