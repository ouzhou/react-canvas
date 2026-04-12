import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("insertText with flat runs exposes textRuns in layout snapshot", async () => {
  const rt = await createSceneRuntime({ width: 400, height: 300 });
  const root = rt.getContentRootId();
  rt.insertText(
    root,
    "multi",
    [
      { text: "aa", color: "#b91c1c" },
      { text: "bb", fontWeight: "bold" },
    ],
    { width: 200, fontSize: 14 },
  );
  const snap = rt.getLayoutSnapshot().multi;
  expect(snap?.textRuns?.length).toBe(2);
  expect(snap?.textContent).toBe("aabb");
  expect(snap?.textLayoutStyle?.fontSize).toBe(14);
});
