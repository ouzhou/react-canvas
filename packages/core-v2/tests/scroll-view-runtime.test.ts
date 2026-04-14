import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("insertScrollView and addScrollY update layout snapshot scrollY", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 200 });
  const root = rt.getContentRootId();
  rt.insertScrollView(root, "sv", { width: 200, height: 80, overflow: "hidden" });
  rt.insertView("sv", "inner", { height: 200 });
  rt.addScrollY("sv", 12);
  expect(rt.getLayoutSnapshot().sv?.scrollY).toBe(12);
});

test("addScrollY clamps at max scroll", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 200 });
  const root = rt.getContentRootId();
  rt.insertScrollView(root, "sv", { width: 200, height: 80, overflow: "hidden" });
  rt.insertView("sv", "inner", { height: 200 });
  rt.addScrollY("sv", 10_000);
  const y1 = rt.getLayoutSnapshot().sv?.scrollY ?? 0;
  rt.addScrollY("sv", 50);
  expect(rt.getLayoutSnapshot().sv?.scrollY).toBe(y1);
});

test("setScrollY sets absolute offset and clamps", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 200 });
  const root = rt.getContentRootId();
  rt.insertScrollView(root, "sv", { width: 200, height: 80, overflow: "hidden" });
  rt.insertView("sv", "inner", { height: 200 });
  rt.addScrollY("sv", 40);
  expect(rt.getLayoutSnapshot().sv?.scrollY).toBe(40);
  rt.setScrollY("sv", 10);
  expect(rt.getLayoutSnapshot().sv?.scrollY).toBe(10);
  rt.setScrollY("sv", -999);
  expect(rt.getLayoutSnapshot().sv?.scrollY).toBe(0);
  rt.setScrollY("sv", 99999);
  expect(rt.getLayoutSnapshot().sv?.scrollY).toBe(120);
});

test("dispatchWheel chains to outer scrollView when inner is at scroll boundary", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 200 });
  const root = rt.getContentRootId();
  rt.insertScrollView(root, "outer", { width: 200, height: 100, overflow: "hidden" });
  rt.insertView("outer", "wrap", { width: 200, height: 400 });
  rt.insertScrollView("wrap", "inner", { width: 200, height: 80, overflow: "hidden" });
  rt.insertView("inner", "innerBody", { width: 200, height: 200 });
  rt.setScrollY("outer", 100);
  expect(rt.getLayoutSnapshot().inner?.scrollY).toBe(0);
  expect(rt.getLayoutSnapshot().outer?.scrollY).toBe(100);
  // 内层已在顶部，负 delta 无法消耗，应传给外层
  rt.dispatchWheel({ x: 100, y: 40, deltaY: -40 });
  expect(rt.getLayoutSnapshot().inner?.scrollY).toBe(0);
  expect(rt.getLayoutSnapshot().outer?.scrollY).toBe(60);
});

test("dispatchWheel consumes inner scroll first when nested", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 200 });
  const root = rt.getContentRootId();
  rt.insertScrollView(root, "outer", { width: 200, height: 100, overflow: "hidden" });
  rt.insertView("outer", "wrap", { width: 200, height: 400 });
  rt.insertScrollView("wrap", "inner", { width: 200, height: 80, overflow: "hidden" });
  rt.insertView("inner", "innerBody", { width: 200, height: 200 });
  rt.setScrollY("outer", 100);
  rt.setScrollY("inner", 50);
  rt.dispatchWheel({ x: 100, y: 40, deltaY: 30 });
  expect(rt.getLayoutSnapshot().inner?.scrollY).toBe(80);
  expect(rt.getLayoutSnapshot().outer?.scrollY).toBe(100);
});
