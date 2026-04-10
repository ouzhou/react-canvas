import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("subscribeAfterLayout fires after insertView and on subscribe", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  let count = 0;
  const off = rt.subscribeAfterLayout(() => {
    count += 1;
  });
  expect(count).toBeGreaterThanOrEqual(1);
  const root = rt.getRootId();
  rt.insertView(root, "a", { width: 10, height: 10 });
  expect(count).toBeGreaterThanOrEqual(2);
  off();
  rt.insertView(root, "b", { width: 10, height: 10 });
  expect(count).toBeGreaterThanOrEqual(2);
});
