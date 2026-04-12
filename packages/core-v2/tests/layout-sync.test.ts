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

test("marginTop on first child increases second child top", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const a = store.createNode("a");
  const b = store.createNode("b");
  applyStylesToYoga(a.yogaNode, { width: 100, height: 30, marginTop: 10 });
  applyStylesToYoga(b.yogaNode, { width: 100, height: 30 });
  store.appendChild(root.id, a.id);
  store.appendChild(root.id, b.id);
  calculateAndSyncLayout(store, root.id, 100, 100);
  expect(store.get(a.id)!.layout!.top).toBe(10);
  expect(store.get(b.id)!.layout!.top).toBe(40);
});

test("paddingTop overrides padding for top edge only", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const box = store.createNode("box");
  const inner = store.createNode("inner");
  applyStylesToYoga(box.yogaNode, { width: 100, height: 100, padding: 4, paddingTop: 10 });
  applyStylesToYoga(inner.yogaNode, { width: 50, height: 50 });
  store.appendChild(root.id, box.id);
  store.appendChild(box.id, inner.id);
  calculateAndSyncLayout(store, root.id, 100, 100);
  expect(store.get(inner.id)!.layout!.top).toBe(10);
  expect(store.get(inner.id)!.layout!.left).toBe(4);
});

test("minHeight wins over smaller height", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 200);
  const box = store.createNode("box");
  applyStylesToYoga(box.yogaNode, { height: 10, minHeight: 80 });
  store.appendChild(root.id, box.id);
  calculateAndSyncLayout(store, root.id, 100, 200);
  expect(store.get(box.id)!.layout!.height).toBe(80);
});

test("row gap increases horizontal offset between children", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(200, 100);
  const row = store.createNode("row");
  const a = store.createNode("a");
  const b = store.createNode("b");
  applyStylesToYoga(row.yogaNode, {
    width: 200,
    height: 50,
    flexDirection: "row",
    gap: 12,
  });
  applyStylesToYoga(a.yogaNode, { width: 30, height: 30 });
  applyStylesToYoga(b.yogaNode, { width: 30, height: 30 });
  store.appendChild(root.id, row.id);
  store.appendChild(row.id, a.id);
  store.appendChild(row.id, b.id);
  calculateAndSyncLayout(store, root.id, 200, 100);
  expect(store.get(b.id)!.layout!.left).toBe(42);
});

test("flexWrap wrap moves overflowing sibling to next line", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(200, 200);
  const row = store.createNode("row");
  const a = store.createNode("a");
  const b = store.createNode("b");
  applyStylesToYoga(row.yogaNode, {
    width: 100,
    height: 200,
    flexDirection: "row",
    flexWrap: "wrap",
  });
  applyStylesToYoga(a.yogaNode, { width: 60, height: 30 });
  applyStylesToYoga(b.yogaNode, { width: 60, height: 30 });
  store.appendChild(root.id, row.id);
  store.appendChild(row.id, a.id);
  store.appendChild(row.id, b.id);
  calculateAndSyncLayout(store, root.id, 200, 200);
  expect(store.get(a.id)!.layout!.top).toBe(0);
  expect(store.get(b.id)!.layout!.top).toBeGreaterThan(0);
});

test("flex number wins over flexGrow when both set", () => {
  const run = (second: { flex: number; flexGrow?: number }) => {
    const store = createNodeStore(yoga);
    const root = store.createRootNode(200, 100);
    const row = store.createNode("row");
    const fixed = store.createNode("fixed");
    const grower = store.createNode("grower");
    applyStylesToYoga(row.yogaNode, { width: 200, height: 50, flexDirection: "row" });
    applyStylesToYoga(fixed.yogaNode, { width: 50, height: 30 });
    applyStylesToYoga(grower.yogaNode, { ...second, height: 30 });
    store.appendChild(root.id, row.id);
    store.appendChild(row.id, fixed.id);
    store.appendChild(row.id, grower.id);
    calculateAndSyncLayout(store, root.id, 200, 100);
    return store.get(grower.id)!.layout!.width;
  };
  const withBoth = run({ flex: 1, flexGrow: 99 });
  const flexOnly = run({ flex: 1 });
  expect(withBoth).toBe(flexOnly);
});
