import { expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CanvasRuntime } from "../src/canvas-runtime.tsx";
import { View } from "../src/view.tsx";

test("debugOverlay renders titled overlay nodes for View ids", async () => {
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <CanvasRuntime width={200} height={200} debugOverlay>
        <View id="v-box" style={{ width: 50, height: 40 }} />
      </CanvasRuntime>,
    );
  });
  await vi.waitFor(() => {
    expect(el.textContent).toContain("v-box");
  });
  root.unmount();
});
