/** @vitest-environment jsdom */
import type { SceneRuntime } from "@react-canvas/core-v2";
import { resetRuntimeInitForTests } from "@react-canvas/core-v2";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { CanvasRuntime } from "../src/canvas-runtime.tsx";
import { useSceneRuntime } from "../src/hooks.ts";
import { Text } from "../src/text.tsx";
import { View } from "../src/view.tsx";
import { vitestRuntimeInitOptions } from "./test-runtime-options.ts";

beforeEach(() => {
  resetRuntimeInitForTests();
});

function GrabRuntime(props: { onReady: (r: SceneRuntime) => void }) {
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    props.onReady(rt);
  });
  return null;
}

test("Text syncs string into layout snapshot as text node", async () => {
  let captured: SceneRuntime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <CanvasRuntime width={220} height={180} initOptions={vitestRuntimeInitOptions}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <View id="wrap" style={{ width: 220, height: 180 }}>
          <Text id="hello" style={{ width: 180, height: 36 }}>
            Hello Text
          </Text>
        </View>
      </CanvasRuntime>,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  const layout = captured!.getLayoutSnapshot().hello;
  expect(layout?.nodeKind).toBe("text");
  expect(layout?.textContent).toBe("Hello Text");
  expect(layout?.width).toBe(180);
  root.unmount();
});

test("Text with nested Text produces textRuns in layout snapshot", async () => {
  let captured: SceneRuntime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <CanvasRuntime width={320} height={200} initOptions={vitestRuntimeInitOptions}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <View id="wrap" style={{ width: 320, height: 200 }}>
          <Text id="nest" style={{ width: 260, fontSize: 14, color: "#0f172a" }}>
            Hello <Text style={{ color: "#b91c1c", fontWeight: "bold" }}>Red</Text> end
          </Text>
        </View>
      </CanvasRuntime>,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  await vi.waitFor(() =>
    expect(captured!.getLayoutSnapshot().nest?.textRuns?.length).toBeGreaterThanOrEqual(2),
  );
  const snap = captured!.getLayoutSnapshot().nest;
  expect(snap?.textContent).toContain("Hello");
  expect(snap?.textContent).toContain("Red");
  expect(snap?.textContent).toContain("end");
  root.unmount();
});
