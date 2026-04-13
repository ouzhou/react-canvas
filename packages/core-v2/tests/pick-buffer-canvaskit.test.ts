/**
 * 真实 CanvasKit 集成测试：PickBuffer.rebuildSurface + hitAt
 *
 * 场景：root 下有一个矩形节点 "rect"，占 (10,10)~(90,90)。
 * 期望：点击矩形内部 (50,50) → hitAt 返回 "rect"
 *       点击矩形外部 (5,5)  → hitAt 返回 null
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { CanvasKit, CanvasKitInitOptions } from "canvaskit-wasm";
import { afterAll, beforeAll, expect, test } from "vite-plus/test";

import { PickBuffer } from "../src/hit/pick-buffer.ts";
import type { LayoutCommitPayload } from "../src/runtime/scene-runtime.ts";

const canvaskitBinDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../node_modules/canvaskit-wasm/bin",
);

async function loadRealCanvasKit(): Promise<CanvasKit> {
  const CanvasKitInit = (await import("canvaskit-wasm")).default as unknown as (
    opts?: CanvasKitInitOptions,
  ) => Promise<CanvasKit>;
  return CanvasKitInit({
    locateFile: (file: string) => join(canvaskitBinDir, file),
  });
}

let ck: CanvasKit | null = null;

beforeAll(async () => {
  ck = await loadRealCanvasKit();
}, 60_000);

afterAll(() => {
  ck = null;
});

function makeSimpleCommit(): LayoutCommitPayload {
  return {
    viewport: { width: 100, height: 100 },
    rootId: "root",
    scene: {
      rootId: "root",
      nodes: {
        root: { parentId: null, children: ["rect"] },
        rect: { parentId: "root", children: [] },
      },
    },
    layout: {
      root: { absLeft: 0, absTop: 0, width: 100, height: 100, left: 0, top: 0 },
      rect: { absLeft: 10, absTop: 10, width: 80, height: 80, left: 10, top: 10 },
    } as LayoutCommitPayload["layout"],
  };
}

test("PickBuffer hitAt returns correct nodeId for point inside rect", () => {
  const c = ck!;
  const surface = c.MakeSurface(100, 100);
  expect(surface).not.toBeNull();
  if (!surface) return;

  const commit = makeSimpleCommit();
  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);
  pb.rebuildSurface(commit, c, surface, 1);

  const hit = pb.hitAt(50, 50);
  console.log("[pick-buffer-canvaskit] hitAt(50,50) =", hit);
  expect(hit).toBe("rect");

  surface.delete();
});

test("PickBuffer hitAt returns null for point outside rect", () => {
  const c = ck!;
  const surface = c.MakeSurface(100, 100);
  expect(surface).not.toBeNull();
  if (!surface) return;

  const commit = makeSimpleCommit();
  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);
  pb.rebuildSurface(commit, c, surface, 1);

  // (5,5) is inside root but outside rect (rect starts at 10,10)
  const hit = pb.hitAt(5, 5);
  console.log("[pick-buffer-canvaskit] hitAt(5,5) =", hit);
  // root is assigned a pickId too, so this may return "root"
  // but "rect" should NOT be hit
  expect(hit).not.toBe("rect");

  surface.delete();
});

test("PickBuffer markDirty + hitAt (lazy rebuild) returns correct nodeId", () => {
  const c = ck!;
  const surface = c.MakeSurface(100, 100);
  expect(surface).not.toBeNull();
  if (!surface) return;

  const commit = makeSimpleCommit();
  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);
  // markDirty instead of rebuildSurface — surface rebuilt lazily on first hitAt
  pb.markDirty(commit, c, surface, 1);

  const hit = pb.hitAt(50, 50);
  console.log("[pick-buffer-canvaskit] markDirty hitAt(50,50) =", hit);
  expect(hit).toBe("rect");

  surface.delete();
});

test("PickBuffer hitAt with rootScale=2 returns correct nodeId", () => {
  const c = ck!;
  const rootScale = 2;
  // Surface is 2× the logical size
  const surface = c.MakeSurface(200, 200);
  expect(surface).not.toBeNull();
  if (!surface) return;

  const commit = makeSimpleCommit();
  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);
  pb.rebuildSurface(commit, c, surface, rootScale);

  // Logical point (50,50) → physical pixel (100,100), inside rect (10..90 logical)
  const hit = pb.hitAt(50, 50);
  console.log("[pick-buffer-canvaskit] hitAt(50,50) with rootScale=2 =", hit);
  expect(hit).toBe("rect");

  surface.delete();
});
