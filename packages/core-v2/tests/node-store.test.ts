import { beforeAll, expect, test } from "vite-plus/test";
import type { Yoga } from "../src/layout/yoga.ts";
import { loadYoga } from "../src/layout/yoga.ts";
import { createNodeStore } from "../src/runtime/node-store.ts";

let yoga: Yoga;

beforeAll(async () => {
  yoga = await loadYoga();
});

test("append child links yoga tree and scene children ids", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const a = store.createNode("child-a");
  store.appendChild(root.id, a.id);
  expect(store.get(root.id)!.children).toEqual([a.id]);
  expect(root.yogaNode.getChildCount()).toBe(1);
  // yoga-layout 的 Node 句柄可能每次包装，不用 Object.is 比较引用。
  expect(a.yogaNode.getParent()).not.toBeNull();
});
