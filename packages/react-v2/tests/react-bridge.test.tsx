/** @vitest-environment jsdom */
import type { SceneRuntime } from "@react-canvas/core-v2";
import { expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CanvasRuntime } from "../src/canvas-runtime.tsx";
import { useSceneRuntime } from "../src/hooks.ts";
import { View } from "../src/view.tsx";
import { vitestRuntimeInitOptions } from "./test-runtime-options.ts";

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
      <CanvasRuntime width={200} height={200} initOptions={vitestRuntimeInitOptions}>
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

test("updating object style calls updateStyle without removing the node", async () => {
  let captured: SceneRuntime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);

  let setWidth!: (w: number) => void;

  function App() {
    const [width, setW] = useState(100);
    setWidth = setW;
    return (
      <CanvasRuntime width={200} height={200} initOptions={vitestRuntimeInitOptions}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <View id="v-update" style={{ width, height: 50 }} />
      </CanvasRuntime>
    );
  }

  await act(async () => {
    root.render(<App />);
  });

  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;
  expect(rt.getLayoutSnapshot()["v-update"]?.width).toBe(100);

  // 监控 insertView / removeView 调用次数
  const insertSpy = vi.spyOn(rt, "insertView");
  const removeSpy = vi.spyOn(rt, "removeView");

  await act(async () => {
    setWidth(200);
  });

  expect(rt.getLayoutSnapshot()["v-update"]?.width).toBe(200);
  // 样式变更不应触发节点销毁重建
  expect(removeSpy).not.toHaveBeenCalled();
  expect(insertSpy).not.toHaveBeenCalled();

  root.unmount();
});

test("removing a style property causes it to disappear from layout snapshot", async () => {
  let captured: SceneRuntime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);

  let setHasBg!: (v: boolean) => void;

  function App() {
    const [hasBg, setH] = useState(true);
    setHasBg = setH;
    const style = hasBg
      ? { width: 100, height: 50, backgroundColor: "#ff0000" }
      : { width: 100, height: 50 };
    return (
      <CanvasRuntime width={200} height={200} initOptions={vitestRuntimeInitOptions}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <View id="v-rm-prop" style={style} />
      </CanvasRuntime>
    );
  }

  await act(async () => {
    root.render(<App />);
  });

  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;
  expect(rt.getLayoutSnapshot()["v-rm-prop"]?.backgroundColor).toBe("#ff0000");

  await act(async () => {
    setHasBg(false);
  });

  // backgroundColor 属性被移除后，快照中不应再出现该字段
  expect(rt.getLayoutSnapshot()["v-rm-prop"]?.backgroundColor).toBeUndefined();

  root.unmount();
});

test("parent style update preserves child node in layout", async () => {
  let captured: SceneRuntime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);

  let setParentBg!: (c: string) => void;

  function App() {
    const [bg, setBg] = useState("#000000");
    setParentBg = setBg;
    return (
      <CanvasRuntime width={200} height={200} initOptions={vitestRuntimeInitOptions}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <View id="v-parent" style={{ width: 100, height: 100, backgroundColor: bg }}>
          <View id="v-child" style={{ width: 50, height: 50 }} />
        </View>
      </CanvasRuntime>
    );
  }

  await act(async () => {
    root.render(<App />);
  });

  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;
  expect(rt.getLayoutSnapshot()["v-child"]?.width).toBe(50);

  await act(async () => {
    setParentBg("#ffffff");
  });

  // 父节点样式更新后，子节点仍应存在于布局快照中
  expect(rt.getLayoutSnapshot()["v-parent"]?.backgroundColor).toBe("#ffffff");
  expect(rt.getLayoutSnapshot()["v-child"]?.width).toBe(50);

  root.unmount();
});
