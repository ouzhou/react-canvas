import { beforeAll, expect, test } from "vite-plus/test";
import type { Yoga } from "../src/layout/yoga.ts";
import { loadYoga } from "../src/layout/yoga.ts";
import { calculateAndSyncLayout } from "../src/layout/layout-sync.ts";
import { applyStylesToYoga } from "../src/layout/style-map.ts";
import { createEventRegistry } from "../src/events/event-registry.ts";
import { dispatchPointerLike } from "../src/events/dispatch.ts";
import { createNodeStore } from "../src/runtime/node-store.ts";

let yoga: Yoga;

beforeAll(async () => {
  yoga = await loadYoga();
});

test("bubble fires on target then ancestors; stopPropagation skips rest", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const leaf = store.createNode("leaf");
  applyStylesToYoga(leaf.yogaNode, { width: 100, height: 100 });
  store.appendChild(root.id, leaf.id);
  calculateAndSyncLayout(store, root.id, 100, 100);

  const registry = createEventRegistry();
  const fired: string[] = [];

  registry.addListener(leaf.id, "pointerdown", () => fired.push("leaf"), {
    label: "leaf",
  });
  registry.addListener(
    root.id,
    "pointerdown",
    () => {
      fired.push("root");
    },
    { label: "root" },
  );

  const t1 = dispatchPointerLike(
    { type: "pointerdown", x: 50, y: 50 },
    {
      store,
      rootId: root.id,
      registry,
      viewportWidth: 100,
      viewportHeight: 100,
    },
  );
  expect(t1.targetId).toBe(leaf.id);
  expect(fired).toEqual(["leaf", "root"]);

  fired.length = 0;
  registry.addListener(
    leaf.id,
    "pointerdown",
    (e) => {
      e.stopPropagation();
    },
    { label: "leaf-stop", capture: false },
  );

  const t2 = dispatchPointerLike(
    { type: "pointerdown", x: 50, y: 50 },
    {
      store,
      rootId: root.id,
      registry,
      viewportWidth: 100,
      viewportHeight: 100,
    },
  );
  expect(t2.entries.some((e) => e.label === "leaf-stop")).toBe(true);
  expect(t2.entries.some((e) => e.label === "root")).toBe(false);
});

test("capture phase runs root-to-target before bubble", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const leaf = store.createNode("leaf");
  applyStylesToYoga(leaf.yogaNode, { width: 100, height: 100 });
  store.appendChild(root.id, leaf.id);
  calculateAndSyncLayout(store, root.id, 100, 100);

  const registry = createEventRegistry();
  const order: string[] = [];

  registry.addListener(
    root.id,
    "click",
    () => {
      order.push("root-cap");
    },
    { capture: true, label: "root-cap" },
  );
  registry.addListener(
    leaf.id,
    "click",
    () => {
      order.push("leaf-bub");
    },
    { label: "leaf-bub" },
  );

  dispatchPointerLike(
    { type: "click", x: 10, y: 10 },
    {
      store,
      rootId: root.id,
      registry,
      viewportWidth: 100,
      viewportHeight: 100,
    },
  );

  expect(order[0]).toBe("root-cap");
  expect(order[1]).toBe("leaf-bub");
});
