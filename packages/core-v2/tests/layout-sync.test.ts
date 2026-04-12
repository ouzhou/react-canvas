import { beforeAll, expect, test } from "vite-plus/test";
import type { Yoga } from "../src/layout/yoga.ts";
import { loadYoga } from "../src/layout/yoga.ts";
import { calculateAndSyncLayout } from "../src/layout/layout-sync.ts";
import { applyStylesToYoga } from "../src/layout/style-map.ts";
import { createNodeStore } from "../src/runtime/node-store.ts";

let yoga: Yoga;

beforeAll(async () => {
  yoga = await loadYoga();
});

test("two column children: second child top is 30 when each height 30", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const a = store.createNode("a");
  const b = store.createNode("b");
  applyStylesToYoga(a.yogaNode, { width: 100, height: 30 });
  applyStylesToYoga(b.yogaNode, { width: 100, height: 30 });
  store.appendChild(root.id, a.id);
  store.appendChild(root.id, b.id);
  calculateAndSyncLayout(store, root.id, 100, 100);
  expect(store.get(a.id)!.layout!.top).toBe(0);
  expect(store.get(b.id)!.layout!.top).toBe(30);
});

test("flex row justify center align center: child is centered in parent", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(200, 200);
  const row = store.createNode("row");
  const leaf = store.createNode("leaf");
  applyStylesToYoga(row.yogaNode, {
    width: 100,
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  });
  applyStylesToYoga(leaf.yogaNode, { width: 20, height: 20 });
  store.appendChild(root.id, row.id);
  store.appendChild(row.id, leaf.id);
  calculateAndSyncLayout(store, root.id, 200, 200);
  expect(store.get(row.id)!.layout!.left).toBe(0);
  expect(store.get(leaf.id)!.layout!.left).toBe(40);
  expect(store.get(leaf.id)!.layout!.top).toBe(15);
});
