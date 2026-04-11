import { beforeAll, expect, test } from "vite-plus/test";
import type { Yoga } from "../src/layout/yoga.ts";
import { loadYoga } from "../src/layout/yoga.ts";
import { calculateAndSyncLayout } from "../src/layout/layout-sync.ts";
import { applyStylesToYoga } from "../src/layout/style-map.ts";
import { resolveCursorFromHitLeaf } from "../src/input/resolve-cursor.ts";
import { createNodeStore } from "../src/runtime/node-store.ts";

let yoga: Yoga;

beforeAll(async () => {
  yoga = await loadYoga();
});

test("leafId null → default", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(10, 10);
  calculateAndSyncLayout(store, root.id, 10, 10);
  expect(resolveCursorFromHitLeaf(null, store)).toBe("default");
});

test("first on chain leaf→root wins: parent pointer, leaf unset uses parent", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const parent = store.createChildAt(root.id, "p");
  const leaf = store.createChildAt(parent.id, "leaf");
  applyStylesToYoga(parent.yogaNode, { width: 100, height: 50 });
  applyStylesToYoga(leaf.yogaNode, { width: 100, height: 50 });
  parent.viewStyle = { cursor: "pointer" };
  calculateAndSyncLayout(store, root.id, 100, 100);
  expect(resolveCursorFromHitLeaf(leaf.id, store)).toBe("pointer");
});

test("leaf overrides parent", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const parent = store.createChildAt(root.id, "p");
  const leaf = store.createChildAt(parent.id, "leaf");
  applyStylesToYoga(parent.yogaNode, { width: 100, height: 50 });
  applyStylesToYoga(leaf.yogaNode, { width: 100, height: 50 });
  parent.viewStyle = { cursor: "pointer" };
  leaf.viewStyle = { cursor: "grab" };
  calculateAndSyncLayout(store, root.id, 100, 100);
  expect(resolveCursorFromHitLeaf(leaf.id, store)).toBe("grab");
});

test("no cursor on chain → default", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const leaf = store.createChildAt(root.id, "leaf");
  applyStylesToYoga(leaf.yogaNode, { width: 50, height: 50 });
  calculateAndSyncLayout(store, root.id, 100, 100);
  expect(resolveCursorFromHitLeaf(leaf.id, store)).toBe("default");
});

test("missing node in store → default", () => {
  const store = createNodeStore(yoga);
  store.createRootNode(10, 10);
  expect(resolveCursorFromHitLeaf("nope", store)).toBe("default");
});
