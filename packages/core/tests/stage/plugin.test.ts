import { describe, expect, it, vi } from "vite-plus/test";
import type { CanvasKit, Surface } from "canvaskit-wasm";

vi.mock("../../src/render/paint.ts", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../src/render/paint.ts")>();
  return { ...mod, paintScene: vi.fn(), paintStageLayers: vi.fn() };
});

import { initYoga, paintScene } from "../../src/index.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";
import { Stage } from "../../src/stage/stage.ts";
import type { Runtime } from "../../src/runtime/runtime.ts";
import type { Plugin } from "../../src/stage/plugin.ts";

function fakeCanvas(): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    style: { width: "", height: "" },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLCanvasElement;
}

describe("Stage plugins", () => {
  it("use calls attach; destroy calls detach in reverse order", async () => {
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
    const log: string[] = [];
    const a: Plugin = {
      name: "a",
      attach() {
        log.push("attach-a");
      },
      detach() {
        log.push("detach-a");
      },
    };
    const b: Plugin = {
      name: "b",
      attach() {
        log.push("attach-b");
      },
      detach() {
        log.push("detach-b");
      },
    };
    stage.use(a).use(b);
    expect(log).toEqual(["attach-a", "attach-b"]);
    stage.destroy();
    expect(log).toEqual(["attach-a", "attach-b", "detach-b", "detach-a"]);
  });

  it("duplicate plugin name throws", async () => {
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
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 16, height: 16, dpr: 1 });
    stage.use({ name: "x", attach: () => {}, detach: () => {} });
    expect(() => stage.use({ name: "x", attach: () => {}, detach: () => {} })).toThrow(
      /duplicate plugin name/,
    );
    stage.destroy();
  });

  it("removePlugin detaches by name", async () => {
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
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 16, height: 16, dpr: 1 });
    let detached = false;
    stage.use({
      name: "p",
      attach: () => {},
      detach: () => {
        detached = true;
      },
    });
    stage.removePlugin("p");
    expect(detached).toBe(true);
    expect(stage.getPlugin("p")).toBeUndefined();
    stage.destroy();
  });

  it("PluginContext cursorManager.set integrates with plugin priority", async () => {
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
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 16, height: 16, dpr: 1 });

    let release: () => void = () => {};
    stage.use({
      name: "c",
      attach(ctx) {
        ctx.cursorManager.setFromNode("pointer");
        release = ctx.cursorManager.set("grabbing", "plugin");
        expect(ctx.cursorManager.resolve()).toBe("grabbing");
      },
      detach() {
        release();
        expect(stage.cursorManager.resolve()).toBe("pointer");
      },
    });
    stage.destroy();
  });

  it("onBeforePaint tap runs when a frame is painted", async () => {
    const yoga: Yoga = await initYoga();
    let rafCb: ((c: unknown) => void) | null = null;
    const surface = {
      requestAnimationFrame(fn: (c: unknown) => void) {
        rafCb = fn;
        return 1;
      },
      delete: vi.fn(),
    } as unknown as Surface;
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

    const seen: number[] = [];
    stage.use({
      name: "paint",
      attach(ctx) {
        ctx.onBeforePaint.tap((e) => {
          seen.push(e.width, e.height);
        });
      },
      detach: () => {},
    });

    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 32, height: 32 });
    stage.requestLayoutPaint(root);

    expect(rafCb).not.toBeNull();
    rafCb!({} as never);

    expect(seen).toEqual([32, 32]);
    expect(vi.mocked(paintScene)).toHaveBeenCalledTimes(1);
    stage.destroy();
  });
});
