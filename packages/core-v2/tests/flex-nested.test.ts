import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

/** 与 apps/v2 react-smoke 等价的 insertView 树，用于确认底行四列有宽度 */
test("nested flex column + row with 4 children gets non-zero widths", async () => {
  const W = 800;
  const H = 600;
  const rt = await createSceneRuntime({ width: W, height: H });
  const root = rt.getRootId();
  rt.insertView(root, "flex-root", {
    width: W,
    height: H,
    flexDirection: "column",
    padding: 12,
  });
  rt.insertView("flex-root", "row-top", { flex: 1, flexDirection: "row" });
  rt.insertView("flex-root", "row-mid", { flex: 1, flexDirection: "row" });
  rt.insertView("flex-root", "row-bot", { flex: 1, flexDirection: "row" });
  for (const id of ["t1", "t2", "t3"]) {
    rt.insertView("row-top", id, { flex: 1, backgroundColor: "#f00" });
  }
  for (const id of ["m1", "m2"]) {
    rt.insertView("row-mid", id, { flex: 1, backgroundColor: "#0f0" });
  }
  for (const id of ["b1", "b2", "b3", "b4"]) {
    rt.insertView("row-bot", id, { flex: 1, backgroundColor: "#00f" });
  }
  const l = rt.getLayoutSnapshot();
  for (const id of ["b1", "b2", "b3", "b4"]) {
    expect(l[id]?.width ?? 0, `${id} width`).toBeGreaterThan(10);
  }
});
