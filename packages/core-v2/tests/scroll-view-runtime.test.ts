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
