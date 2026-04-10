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
