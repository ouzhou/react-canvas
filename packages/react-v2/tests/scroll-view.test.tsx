/** @vitest-environment jsdom */
import type { SceneRuntime } from "@react-canvas/core-v2";
import { resetRuntimeInitForTests } from "@react-canvas/core-v2";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { CanvasRuntime } from "../src/canvas-runtime.tsx";
import { useSceneRuntime } from "../src/hooks.ts";
import { ScrollView } from "../src/scroll-view.tsx";
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

function ScrollResetHarness(props: { resetKey: number; onReady: (r: SceneRuntime) => void }) {
  return (
    <CanvasRuntime width={240} height={200} initOptions={vitestRuntimeInitOptions}>
      <GrabRuntime onReady={props.onReady} />
      <View id="wrap" style={{ width: 240, height: 200, flexDirection: "column" }}>
        <ScrollView
          id="test-scroll"
          scrollResetKey={props.resetKey}
          style={{ flex: 1, minHeight: 0, width: 240 }}
        >
          <View id="inner-block" style={{ height: 400, backgroundColor: "#e2e8f0" }} />
        </ScrollView>
      </View>
    </CanvasRuntime>
  );
}

test("ScrollView registers scroll node and addScrollY updates snapshot", async () => {
  let captured: SceneRuntime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <ScrollResetHarness
        resetKey={0}
        onReady={(r) => {
          captured = r;
        }}
      />,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;
  expect(rt.hasSceneNode("test-scroll")).toBe(true);
  rt.addScrollY("test-scroll", 20);
  expect(rt.getLayoutSnapshot()["test-scroll"]?.scrollY).toBe(20);
  root.unmount();
});

test("ScrollView scrollResetKey resets scrollY to 0", async () => {
  let captured: SceneRuntime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <ScrollResetHarness
        resetKey={0}
        onReady={(r) => {
          captured = r;
        }}
      />,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;
  rt.addScrollY("test-scroll", 55);
  expect(rt.getLayoutSnapshot()["test-scroll"]?.scrollY).toBe(55);
  await act(async () => {
    root.render(
      <ScrollResetHarness
        resetKey={1}
        onReady={(r) => {
          captured = r;
        }}
      />,
    );
  });
  expect(rt.getLayoutSnapshot()["test-scroll"]?.scrollY).toBe(0);
  root.unmount();
});
