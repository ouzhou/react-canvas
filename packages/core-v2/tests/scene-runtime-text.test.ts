import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("insertText creates text node with layout and snapshot fields", async () => {
  const rt = await createSceneRuntime({ width: 320, height: 240 });
  const root = rt.getContentRootId();
  rt.insertText(root, "label-1", "你好 React Canvas", {
    width: 280,
    height: 40,
    backgroundColor: "#e2e8f0",
  });
  const layout = rt.getLayoutSnapshot()["label-1"];
  expect(layout).toBeDefined();
  expect(layout!.width).toBe(280);
  expect(layout!.height).toBe(40);
  expect(layout!.textContent).toBe("你好 React Canvas");
  expect(layout!.nodeKind).toBe("text");
});

test("insertText updates existing node", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 200 });
  const root = rt.getContentRootId();
  rt.insertText(root, "t", "a", { width: 100, height: 20 });
  rt.insertText(root, "t", "b", { width: 100, height: 24 });
  expect(rt.getLayoutSnapshot().t!.textContent).toBe("b");
  expect(rt.getLayoutSnapshot().t!.height).toBe(24);
});
