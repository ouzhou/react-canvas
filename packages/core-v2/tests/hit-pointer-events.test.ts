import { beforeAll, expect, test } from "vite-plus/test";
import type { Yoga } from "../src/layout/yoga.ts";
import { loadYoga } from "../src/layout/yoga.ts";
import { hitTestAt } from "../src/hit/hit-test.ts";
import { calculateAndSyncLayout } from "../src/layout/layout-sync.ts";
import { applyStylesToYoga } from "../src/layout/style-map.ts";
import { createNodeStore } from "../src/runtime/node-store.ts";

let yoga: Yoga;

beforeAll(async () => {
  yoga = await loadYoga();
});

test("pointerEvents none: subtree skipped, hit falls through to ancestor", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const leaf = store.createNode("leaf");
  leaf.viewStyle = { width: 100, height: 100, pointerEvents: "none" };
  applyStylesToYoga(leaf.yogaNode, leaf.viewStyle);
  store.appendChild(root.id, leaf.id);
  calculateAndSyncLayout(store, root.id, 100, 100);

  expect(hitTestAt(50, 50, root.id, store)).toBe(root.id);
});

test("pointerEvents auto (default): deepest child hit as before", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const leaf = store.createNode("leaf");
  leaf.viewStyle = { width: 100, height: 100, pointerEvents: "auto" };
  applyStylesToYoga(leaf.yogaNode, leaf.viewStyle);
  store.appendChild(root.id, leaf.id);
  calculateAndSyncLayout(store, root.id, 100, 100);

  expect(hitTestAt(50, 50, root.id, store)).toBe(leaf.id);
});

test("pointerEvents omitted behaves like auto", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const leaf = store.createNode("leaf");
  leaf.viewStyle = { width: 100, height: 100 };
  applyStylesToYoga(leaf.yogaNode, leaf.viewStyle);
  store.appendChild(root.id, leaf.id);
  calculateAndSyncLayout(store, root.id, 100, 100);

  expect(hitTestAt(50, 50, root.id, store)).toBe(leaf.id);
});

test("root pointerEvents none yields null hit", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  root.viewStyle = { pointerEvents: "none" };
  calculateAndSyncLayout(store, root.id, 100, 100);

  expect(hitTestAt(50, 50, root.id, store)).toBe(null);
});
