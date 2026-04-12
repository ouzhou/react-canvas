import { expect, test, vi } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("insertSvgPath puts viewBox fields in layout snapshot", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const root = rt.getContentRootId();
  rt.insertSvgPath(root, "p1", {
    d: "M0 0 L10 0 L10 10 Z",
    viewBox: "0 0 24 24",
    style: { width: 48, height: 48 },
    stroke: "#000",
    fill: "none",
    strokeWidth: 2,
  });
  const L = rt.getLayoutSnapshot().p1!;
  expect(L.nodeKind).toBe("svgPath");
  expect(L.svgPathD).toBe("M0 0 L10 0 L10 10 Z");
  expect(L.svgPathViewBoxWidth).toBe(24);
  expect(L.svgPathViewBoxHeight).toBe(24);
  expect(L.svgStrokeWidth).toBe(2);
});

test("insertSvgPath default viewBox is 0 0 24 24", async () => {
  const rt = await createSceneRuntime({ width: 50, height: 50 });
  rt.insertSvgPath(rt.getContentRootId(), "p2", {
    d: "M0 0 L1 0 L1 1 Z",
    style: { width: 24, height: 24 },
  });
  const L = rt.getLayoutSnapshot().p2!;
  expect(L.svgPathViewBoxMinX).toBe(0);
  expect(L.svgPathViewBoxMinY).toBe(0);
  expect(L.svgPathViewBoxWidth).toBe(24);
  expect(L.svgPathViewBoxHeight).toBe(24);
});

test("invalid viewBox omits drawable fields", async () => {
  const rt = await createSceneRuntime({ width: 50, height: 50 });
  const err = vi.fn();
  rt.insertSvgPath(rt.getContentRootId(), "bad", {
    d: "M0 0 L1 0 L1 1 Z",
    viewBox: "0 0 NaN 24",
    style: { width: 10, height: 10 },
    onError: err,
  });
  expect(err).toHaveBeenCalled();
  const L = rt.getLayoutSnapshot().bad!;
  expect(L.nodeKind).toBe("svgPath");
  expect(L.svgPathD).toBeUndefined();
});
