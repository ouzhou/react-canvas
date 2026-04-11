/** @vitest-environment jsdom */
import type { SceneRuntime } from "@react-canvas/core-v2";
import { expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { useLayoutEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { CanvasRuntime } from "../src/canvas-runtime.tsx";
import { useSceneRuntime } from "../src/hooks.ts";
import { Modal } from "../src/modal.tsx";
import { View } from "../src/view.tsx";

function GrabRuntime(props: { onReady: (r: SceneRuntime) => void; children?: ReactNode }) {
  const rt = useSceneRuntime();
  useLayoutEffect(() => {
    props.onReady(rt);
  });
  return <>{props.children}</>;
}

test("Modal visible: click on backdrop calls onRequestClose", async () => {
  let captured: SceneRuntime | null = null;
  const onClose = vi.fn();
  const el = document.createElement("div");
  const root = createRoot(el);

  await act(async () => {
    root.render(
      <CanvasRuntime width={200} height={200}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <Modal visible onRequestClose={onClose}>
          <View
            id="modal-card"
            style={{
              width: 80,
              height: 40,
              position: "absolute",
              left: 60,
              top: 80,
              backgroundColor: "#ffffff",
            }}
          />
        </Modal>
      </CanvasRuntime>,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;

  rt.dispatchPointerLike({ type: "click", x: 10, y: 10 });
  expect(onClose).toHaveBeenCalledTimes(1);

  root.unmount();
});

test("Modal visible=false does not mount modal subtree; onRequestClose not called", async () => {
  let captured: SceneRuntime | null = null;
  const onClose = vi.fn();
  const el = document.createElement("div");
  const root = createRoot(el);

  await act(async () => {
    root.render(
      <CanvasRuntime width={200} height={200}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <Modal visible={false} onRequestClose={onClose}>
          <View id="never-mounted" style={{ width: 10, height: 10 }} />
        </Modal>
      </CanvasRuntime>,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;
  expect(rt.hasSceneNode("never-mounted")).toBe(false);
  rt.dispatchPointerLike({ type: "click", x: 10, y: 10 });
  expect(onClose).not.toHaveBeenCalled();

  root.unmount();
});

test("click on modal card does not call onRequestClose", async () => {
  let captured: SceneRuntime | null = null;
  const onClose = vi.fn();
  const el = document.createElement("div");
  const root = createRoot(el);

  await act(async () => {
    root.render(
      <CanvasRuntime width={200} height={200}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <Modal visible onRequestClose={onClose}>
          <View
            id="card-hit"
            style={{
              width: 80,
              height: 40,
              position: "absolute",
              left: 60,
              top: 80,
              backgroundColor: "#ffffff",
            }}
          />
        </Modal>
      </CanvasRuntime>,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;
  rt.dispatchPointerLike({ type: "click", x: 100, y: 100 });
  expect(onClose).not.toHaveBeenCalled();

  root.unmount();
});

test("transparent backdrop still receives click and calls onRequestClose (spec §5.1)", async () => {
  let captured: SceneRuntime | null = null;
  const onClose = vi.fn();
  const el = document.createElement("div");
  const root = createRoot(el);

  await act(async () => {
    root.render(
      <CanvasRuntime width={200} height={200}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <Modal visible transparent onRequestClose={onClose}>
          <View
            id="modal-card-tr"
            style={{
              width: 80,
              height: 40,
              position: "absolute",
              left: 60,
              top: 80,
              backgroundColor: "#ffffff",
            }}
          />
        </Modal>
      </CanvasRuntime>,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;

  rt.dispatchPointerLike({ type: "click", x: 10, y: 10 });
  expect(onClose).toHaveBeenCalledTimes(1);

  root.unmount();
});

test("when Modal open, click does not reach scene-content View behind (stacking)", async () => {
  let captured: SceneRuntime | null = null;
  const onClose = vi.fn();
  const onMain = vi.fn();
  const el = document.createElement("div");
  const root = createRoot(el);

  await act(async () => {
    root.render(
      <CanvasRuntime width={200} height={200}>
        <GrabRuntime onReady={(r) => (captured = r)} />
        <View
          id="main-underlay"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 200,
            height: 200,
            backgroundColor: "#fecaca",
          }}
          onClick={onMain}
        />
        <Modal visible onRequestClose={onClose} />
      </CanvasRuntime>,
    );
  });
  await vi.waitFor(() => expect(captured).not.toBeNull());
  const rt = captured!;

  rt.dispatchPointerLike({ type: "click", x: 50, y: 50 });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onMain).not.toHaveBeenCalled();

  root.unmount();
});
