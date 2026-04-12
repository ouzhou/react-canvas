import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

/** Yoga `borderWidth` 参与布局：子节点可用宽度 = 父宽 − 左右 border。 */
test("borderWidth reduces inner layout width for flex child", async () => {
  const rt = await createSceneRuntime({ width: 400, height: 400 });
  const contentRoot = rt.getContentRootId();
  rt.insertView(contentRoot, "shell", {
    width: 200,
    height: 200,
    flexDirection: "column",
    borderWidth: 20,
    borderColor: "#000000",
  });
  rt.insertView("shell", "inner", { flex: 1, backgroundColor: "#ff0000" });
  const l = rt.getLayoutSnapshot();
  expect(l.inner?.width).toBe(160);
  expect(l.inner?.height).toBe(160);
  expect(l.shell?.borderWidth).toBe(20);
  expect(l.shell?.borderColor).toBe("#000000");
});
