import { expect, test } from "vite-plus/test";
import { PickBuffer } from "../src/hit/pick-buffer.ts";
import type { LayoutCommitPayload } from "../src/runtime/scene-runtime.ts";

function makeCommit(
  nodes: Record<string, { parentId: string | null; children: string[] }>,
  layout: Record<string, { absLeft: number; absTop: number; width: number; height: number }>,
  rootId: string,
): LayoutCommitPayload {
  return {
    viewport: { width: 400, height: 300 },
    rootId,
    scene: { rootId, nodes },
    layout: layout as LayoutCommitPayload["layout"],
  };
}

test("rebuildPickIdMap assigns unique ids to all visible nodes", () => {
  const commit = makeCommit(
    {
      root: { parentId: null, children: ["a", "b"] },
      a: { parentId: "root", children: [] },
      b: { parentId: "root", children: [] },
    },
    {
      root: { absLeft: 0, absTop: 0, width: 400, height: 300 },
      a: { absLeft: 0, absTop: 0, width: 200, height: 300 },
      b: { absLeft: 200, absTop: 0, width: 200, height: 300 },
    },
    "root",
  );

  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);

  const idA = pb.nodeIdMap.get("a");
  const idB = pb.nodeIdMap.get("b");
  expect(idA).toBeGreaterThan(0);
  expect(idB).toBeGreaterThan(0);
  expect(idA).not.toBe(idB);
  expect(pb.pickIdMap.get(idA!)).toBe("a");
  expect(pb.pickIdMap.get(idB!)).toBe("b");
});

test("rebuildPickIdMap skips pointerEvents:none nodes", () => {
  const commit = makeCommit(
    {
      root: { parentId: null, children: ["a"] },
      a: { parentId: "root", children: [] },
    },
    {
      root: { absLeft: 0, absTop: 0, width: 400, height: 300 },
      a: { absLeft: 0, absTop: 0, width: 200, height: 300 },
    },
    "root",
  );
  // Mark node "a" as pointerEvents:none
  (commit.layout["a"] as Record<string, unknown>)["pointerEvents"] = "none";

  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);

  expect(pb.nodeIdMap.has("a")).toBe(false);
});

test("rebuildPickIdMap resets ids each call", () => {
  const commit = makeCommit(
    {
      root: { parentId: null, children: ["a"] },
      a: { parentId: "root", children: [] },
    },
    {
      root: { absLeft: 0, absTop: 0, width: 400, height: 300 },
      a: { absLeft: 0, absTop: 0, width: 200, height: 300 },
    },
    "root",
  );

  const pb = new PickBuffer();
  pb.rebuildPickIdMap(commit);
  const firstId = pb.nodeIdMap.get("a")!;

  pb.rebuildPickIdMap(commit);
  const secondId = pb.nodeIdMap.get("a")!;

  // ids reset each call, same tree → same ids
  expect(firstId).toBe(secondId);
  expect(firstId).toBeGreaterThan(0);
});
