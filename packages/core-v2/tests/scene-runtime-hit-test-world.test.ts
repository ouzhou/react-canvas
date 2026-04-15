import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("hitTestWorld matches click dispatch hit (CPU hitTestAt path)", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  const contentRoot = rt.getContentRootId();
  rt.insertView(contentRoot, "leaf", { width: 50, height: 50 });

  expect(rt.hitTestWorld(10, 10)).toBe("leaf");

  rt.dispatchPointerLike({ type: "click", x: 10, y: 10 });
  expect(rt.getLastDispatchTrace().hit).toBe("leaf");
});

test("hitTestWorld does not dispatch pointer events or mutate hover trace", async () => {
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
  rt.addListener("b", "pointerenter", () => order.push("b:enter"));

  rt.dispatchPointerLike({ type: "pointermove", x: 10, y: 10 });
  expect(order).toEqual(["a:enter"]);
  const traceAfterMove = rt.getLastDispatchTrace();

  expect(rt.hitTestWorld(60, 10)).toBe("b");
  expect(order).toEqual(["a:enter"]);
  expect(rt.getLastDispatchTrace()).toEqual(traceAfterMove);
});
