import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("text without fixed height wraps and grows vertically (approx measure)", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 400 });
  const root = rt.getContentRootId();
  rt.insertView(root, "col", { width: 200, height: 400, flexDirection: "column" });
  const long = "abcdefghijklmnopqrstuvwxyz0123456789".repeat(4);
  rt.insertText("col", "t-wrap", long, { width: 90, fontSize: 14 });
  const lay = rt.getLayoutSnapshot()["t-wrap"];
  expect(lay).toBeDefined();
  expect(lay!.height).toBeGreaterThan(20);
});

test("text with explicit numeric height skips measure height growth", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 200 });
  const root = rt.getContentRootId();
  rt.insertText(root, "t-fixed", "many words ".repeat(20), {
    width: 180,
    height: 22,
    fontSize: 12,
  });
  expect(rt.getLayoutSnapshot()["t-fixed"]!.height).toBe(22);
});
