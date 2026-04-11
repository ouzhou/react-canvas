import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("getSceneGraphSnapshot and getLayoutSnapshot are JSON-safe after dispatch", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const rootId = rt.getRootId();
  rt.insertView(rt.getContentRootId(), "v1", { width: 50, height: 50 });
  rt.dispatchPointerLike({ type: "pointerdown", x: 10, y: 10 });

  const g = rt.getSceneGraphSnapshot();
  const l = rt.getLayoutSnapshot();
  const t = rt.getLastDispatchTrace();

  expect(JSON.stringify(g)).toContain(rootId);
  expect(JSON.stringify(l)).toContain("v1");
  expect(JSON.stringify(t)).toBeTruthy();
  expect(t.entries.length).toBeGreaterThanOrEqual(0);
});
