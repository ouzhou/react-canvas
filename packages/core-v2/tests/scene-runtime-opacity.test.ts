import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("layout snapshot includes clamped opacity", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const root = rt.getContentRootId();
  rt.insertView(root, "semi", { width: 40, height: 40, opacity: 0.5 });
  const snap = rt.getLayoutSnapshot();
  expect(snap.semi?.opacity).toBe(0.5);
});

test("opacity >= 1 is omitted from snapshot", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const root = rt.getContentRootId();
  rt.insertView(root, "opaque", { width: 40, height: 40, opacity: 1 });
  const snap = rt.getLayoutSnapshot();
  expect(snap.opaque?.opacity).toBeUndefined();
});

test("opacity <= 0 is stored as 0 in snapshot", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const root = rt.getContentRootId();
  rt.insertView(root, "hidden", { width: 10, height: 10, opacity: 0 });
  expect(rt.getLayoutSnapshot().hidden?.opacity).toBe(0);
});

test("invalid opacity is omitted from snapshot", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const root = rt.getContentRootId();
  rt.insertView(root, "bad", { width: 10, height: 10, opacity: Number.NaN });
  expect(rt.getLayoutSnapshot().bad?.opacity).toBeUndefined();
});
