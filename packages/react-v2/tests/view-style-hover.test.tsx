/** @vitest-environment jsdom */
import type { SceneRuntime } from "@react-canvas/core-v2";
import { expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { CanvasRuntime } from "../src/canvas-runtime.tsx";
import { useSceneRuntime } from "../src/hooks.ts";
import { View } from "../src/view.tsx";

function GrabRuntime(props: { onReady: (r: SceneRuntime) => void }) {
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    props.onReady(rt);
  });
  return null;
}

test("function style receives hovered from pointerenter / pointerleave", async () => {
  let captured: SceneRuntime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);

  await act(async () => {
    root.render(
      <CanvasRuntime width={200} height={200}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <View
          id="v-hover"
          style={({ hovered }) => ({
            width: 100,
            height: 60,
            position: "absolute",
            left: 0,
            top: 0,
            backgroundColor: hovered ? "#ff0000" : "#0000ff",
          })}
        />
      </CanvasRuntime>,
    );
  });

  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;

  await act(async () => {
    rt.dispatchPointerLike({ type: "pointermove", x: 50, y: 30 });
  });

  await vi.waitFor(() => {
    expect(rt.getLayoutSnapshot()["v-hover"]?.backgroundColor).toBe("#ff0000");
  });
  expect(rt.getLastDispatchTrace().entries.some((e) => e.type === "pointerenter")).toBe(true);

  await act(async () => {
    rt.notifyPointerLeftStage(50, 30);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(rt.getLastDispatchTrace().entries.some((e) => e.type === "pointerleave")).toBe(true);

  await vi.waitFor(() => {
    expect(rt.getLayoutSnapshot()["v-hover"]?.backgroundColor).toBe("#0000ff");
  });

  root.unmount();
});
