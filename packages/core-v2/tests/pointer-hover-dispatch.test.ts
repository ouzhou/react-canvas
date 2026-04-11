import { expect, test, vi } from "vite-plus/test";
import * as layoutSync from "../src/layout/layout-sync.ts";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("pointer move: leave then enter then move when leaf changes (scheme A)", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const contentRoot = rt.getContentRootId();
  rt.insertView(contentRoot, "a", {
    width: 40,
    height: 40,
    position: "absolute",
    left: 0,
    top: 0,
  });
  rt.insertView(contentRoot, "b", {
    width: 40,
    height: 40,
    position: "absolute",
    left: 50,
    top: 0,
  });

  const order: string[] = [];
  rt.addListener("a", "pointerenter", () => order.push("a:enter"));
  rt.addListener("a", "pointerleave", () => order.push("a:leave"));
  rt.addListener("a", "pointermove", () => order.push("a:move"));
  rt.addListener("b", "pointerenter", () => order.push("b:enter"));
  rt.addListener("b", "pointermove", () => order.push("b:move"));

  rt.dispatchPointerLike({ type: "pointermove", x: 10, y: 10 });
  expect(order).toEqual(["a:enter", "a:move"]);

  order.length = 0;
  rt.dispatchPointerLike({ type: "pointermove", x: 60, y: 10 });
  expect(order).toEqual(["a:leave", "b:enter", "b:move"]);
});

test("same leaf move: no enter/leave, only pointermove", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const contentRoot = rt.getContentRootId();
  rt.insertView(contentRoot, "leaf", { width: 50, height: 50 });

  const order: string[] = [];
  rt.addListener("leaf", "pointerenter", () => order.push("enter"));
  rt.addListener("leaf", "pointerleave", () => order.push("leave"));
  rt.addListener("leaf", "pointermove", () => order.push("move"));

  rt.dispatchPointerLike({ type: "pointermove", x: 10, y: 10 });
  order.length = 0;
  rt.dispatchPointerLike({ type: "pointermove", x: 12, y: 12 });
  expect(order).toEqual(["move"]);
});

test("notifyPointerLeftStage emits pointerleave and clears hover", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const contentRoot = rt.getContentRootId();
  rt.insertView(contentRoot, "leaf", { width: 50, height: 50 });

  const seen: string[] = [];
  rt.addListener("leaf", "pointerleave", () => seen.push("leave"));

  rt.dispatchPointerLike({ type: "pointermove", x: 10, y: 10 });
  rt.notifyPointerLeftStage(10, 10);
  expect(seen).toEqual(["leave"]);

  seen.length = 0;
  rt.notifyPointerLeftStage(0, 0);
  expect(seen).toEqual([]);
});

test("repeated pointerdown without tree changes does not call calculateAndSyncLayout each time", async () => {
  const spy = vi.spyOn(layoutSync, "calculateAndSyncLayout");
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const contentRoot = rt.getContentRootId();
  rt.insertView(contentRoot, "v", { width: 50, height: 50 });

  const nAfterInsert = spy.mock.calls.length;

  for (let i = 0; i < 5; i++) {
    rt.dispatchPointerLike({ type: "pointerdown", x: 10, y: 10 });
  }

  expect(spy.mock.calls.length).toBe(nAfterInsert);
  spy.mockRestore();
});
