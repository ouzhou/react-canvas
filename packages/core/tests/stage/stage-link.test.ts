import { beforeAll, describe, expect, test } from "vite-plus/test";

import { initYoga } from "../../src/layout/yoga.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";
import { getStageFromViewNode } from "../../src/stage/stage-link.ts";
import { Stage } from "../../src/stage/stage.ts";
import type { Runtime } from "../../src/runtime/runtime.ts";
import type { CanvasKit, Surface } from "canvaskit-wasm";

function fakeCanvas(): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    style: { width: "", height: "" },
  } as unknown as HTMLCanvasElement;
}

function minimalRuntime(yoga: Yoga): Runtime {
  const surface = { requestAnimationFrame: () => 0, delete: () => {} } as unknown as Surface;
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

describe("getStageFromViewNode", () => {
  let yoga: Yoga;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  test("returns Stage for a descendant of defaultLayer.root", () => {
    const runtime = minimalRuntime(yoga);
    const stage = new Stage(runtime, { canvas: fakeCanvas(), width: 100, height: 100, dpr: 1 });
    const child = new ViewNode(yoga, "View");
    stage.defaultLayer.add(child);
    expect(getStageFromViewNode(child)).toBe(stage);
  });

  test("returns null when node is not under any Layer root", () => {
    const orphan = new ViewNode(yoga, "View");
    expect(getStageFromViewNode(orphan)).toBeNull();
  });
});
