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

test("View syncs layout into SceneRuntime", async () => {
  let captured: SceneRuntime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <CanvasRuntime width={200} height={200}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <View id="v-test" style={{ width: 100, height: 60 }} />
      </CanvasRuntime>,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  const layout = captured!.getLayoutSnapshot();
  expect(layout["v-test"]?.width).toBe(100);
  expect(layout["v-test"]?.height).toBe(60);
  root.unmount();
});
