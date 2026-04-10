import { beforeAll, expect, test } from "vite-plus/test";
import type { Yoga } from "../src/layout/yoga.ts";
import { loadYoga } from "../src/layout/yoga.ts";
import { calculateAndSyncLayout } from "../src/layout/layout-sync.ts";
import { applyStylesToYoga } from "../src/layout/style-map.ts";
import { hitTestAt } from "../src/hit/hit-test.ts";
import { createNodeStore } from "../src/runtime/node-store.ts";

let yoga: Yoga;

beforeAll(async () => {
  yoga = await loadYoga();
});

test("later sibling wins when overlapping regions; outside returns null", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const a = store.createNode("a");
  const b = store.createNode("b");
  applyStylesToYoga(a.yogaNode, { width: 100, flex: 1 });
  applyStylesToYoga(b.yogaNode, { width: 100, flex: 1 });
  store.appendChild(root.id, a.id);
  store.appendChild(root.id, b.id);
  calculateAndSyncLayout(store, root.id, 100, 100);

  expect(hitTestAt(50, 25, root.id, store)).toBe(a.id);
  expect(hitTestAt(50, 75, root.id, store)).toBe(b.id);
  expect(hitTestAt(200, 200, root.id, store)).toBeNull();
});
