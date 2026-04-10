import type { SceneRuntime } from "@react-canvas/core-v2";
import { createSceneRuntime } from "@react-canvas/core-v2";
import { expect, test } from "vite-plus/test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { StagePointerSurface } from "../src/stage-pointer-surface.tsx";

test("StagePointerSurface forwards primary click to dispatchPointerLike", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 200 });
  const rootId = rt.getRootId();
  rt.insertView(rootId, "hit", { width: 200, height: 200 });
  let clicks = 0;
  rt.addListener("hit", "click", () => {
    clicks += 1;
  });

  const wrap = document.createElement("div");
  document.body.appendChild(wrap);
  const reactRoot = createRoot(wrap);
  await act(async () => {
    reactRoot.render(
      <div style={{ position: "relative", width: 200, height: 200 }}>
        <StagePointerSurface runtime={rt as SceneRuntime} />
      </div>,
    );
  });

  const surface = wrap.querySelector('[role="presentation"]') as HTMLDivElement | null;
  expect(surface).not.toBeNull();
  surface!.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 200,
      height: 200,
      top: 0,
      left: 0,
      right: 200,
      bottom: 200,
      toJSON: () => ({}),
    }) as DOMRect;

  await act(async () => {
    surface!.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        clientX: 50,
        clientY: 40,
        pointerId: 1,
        button: 0,
      }),
    );
    surface!.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        clientX: 50,
        clientY: 40,
        pointerId: 1,
        button: 0,
      }),
    );
  });

  expect(clicks).toBe(1);

  reactRoot.unmount();
  wrap.remove();
});
