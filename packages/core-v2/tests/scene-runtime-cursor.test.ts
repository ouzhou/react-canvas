import { expect, test } from "vite-plus/test";
import { bindSceneRuntimeCursorTarget, createSceneRuntime } from "../src/runtime/scene-runtime.ts";

function fakeCanvas(): HTMLCanvasElement {
  const style: { cursor: string } = { cursor: "" };
  return { style } as unknown as HTMLCanvasElement;
}

test("pointermove writes canvas.style.cursor from viewStyle.cursor", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const contentRoot = rt.getContentRootId();
  const canvas = fakeCanvas();
  bindSceneRuntimeCursorTarget(rt, canvas);

  rt.insertView(contentRoot, "box", {
    width: 50,
    height: 50,
    cursor: "pointer",
  });

  expect(canvas.style.cursor).toBe("default");
  rt.dispatchPointerLike({ type: "pointermove", x: 10, y: 10 });
  expect(canvas.style.cursor).toBe("pointer");

  rt.dispatchPointerLike({ type: "pointermove", x: 80, y: 80 });
  expect(canvas.style.cursor).toBe("default");

  bindSceneRuntimeCursorTarget(rt, null);
});

test("notifyPointerLeftStage resets cursor to default", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const contentRoot = rt.getContentRootId();
  const canvas = fakeCanvas();
  bindSceneRuntimeCursorTarget(rt, canvas);

  rt.insertView(contentRoot, "box", {
    width: 50,
    height: 50,
    cursor: "crosshair",
  });

  rt.dispatchPointerLike({ type: "pointermove", x: 10, y: 10 });
  expect(canvas.style.cursor).toBe("crosshair");

  rt.notifyPointerLeftStage(10, 10);
  expect(canvas.style.cursor).toBe("default");
});

test("pointerdown + sync patchStyle updates cursor without pointermove", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const contentRoot = rt.getContentRootId();
  const canvas = fakeCanvas();
  bindSceneRuntimeCursorTarget(rt, canvas);

  rt.insertView(contentRoot, "box", {
    width: 50,
    height: 50,
    cursor: "grab",
  });

  rt.dispatchPointerLike({ type: "pointermove", x: 10, y: 10 });
  expect(canvas.style.cursor).toBe("grab");

  rt.addListener("box", "pointerdown", () => {
    rt.patchStyle("box", { cursor: "grabbing" });
  });

  rt.dispatchPointerLike({ type: "pointerdown", x: 10, y: 10 });
  expect(canvas.style.cursor).toBe("grabbing");
});

test("updateStyle cursor applies without pointermove while hover target unchanged", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const contentRoot = rt.getContentRootId();
  const canvas = fakeCanvas();
  bindSceneRuntimeCursorTarget(rt, canvas);

  rt.insertView(contentRoot, "box", {
    width: 50,
    height: 50,
    cursor: "grab",
  });

  rt.dispatchPointerLike({ type: "pointermove", x: 10, y: 10 });
  expect(canvas.style.cursor).toBe("grab");

  rt.updateStyle("box", {
    width: 50,
    height: 50,
    cursor: "grabbing",
  });
  expect(canvas.style.cursor).toBe("grabbing");
});
