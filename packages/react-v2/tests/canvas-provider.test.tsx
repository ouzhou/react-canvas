/** @vitest-environment jsdom */
import type { Runtime } from "@react-canvas/core-v2";
import { resetRuntimeInitForTests } from "@react-canvas/core-v2";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CanvasProvider } from "../src/canvas-provider.tsx";
import { vitestRuntimeInitOptions } from "./test-runtime-options.ts";

beforeEach(() => {
  resetRuntimeInitForTests();
});

function flushMicrotasks(): Promise<void> {
  return new Promise((r) => queueMicrotask(r));
}

test("two CanvasProvider trees share the same module runtime when ready", async () => {
  let a: Runtime | null = null;
  let b: Runtime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <>
        <CanvasProvider initOptions={vitestRuntimeInitOptions}>
          {({ runtime }) => {
            a = runtime;
            return null;
          }}
        </CanvasProvider>
        <CanvasProvider initOptions={vitestRuntimeInitOptions}>
          {({ runtime }) => {
            b = runtime;
            return null;
          }}
        </CanvasProvider>
      </>,
    );
  });
  await act(async () => {
    await flushMicrotasks();
  });
  await vi.waitFor(
    () => {
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
    },
    { timeout: 15_000 },
  );
  expect(a).toBe(b);
  root.unmount();
});

test("second CanvasProvider mounts after first is ready still sees same runtime", async () => {
  let first: Runtime | null = null;
  let second: Runtime | null = null;
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <CanvasProvider initOptions={vitestRuntimeInitOptions}>
        {({ runtime }) => {
          first = runtime;
          return null;
        }}
      </CanvasProvider>,
    );
  });
  await act(async () => {
    await flushMicrotasks();
  });
  await vi.waitFor(() => expect(first).not.toBeNull(), { timeout: 15_000 });

  await act(async () => {
    root.render(
      <>
        <CanvasProvider initOptions={vitestRuntimeInitOptions}>
          {({ runtime }) => {
            first = runtime;
            return null;
          }}
        </CanvasProvider>
        <CanvasProvider initOptions={vitestRuntimeInitOptions}>
          {({ runtime }) => {
            second = runtime;
            return null;
          }}
        </CanvasProvider>
      </>,
    );
  });
  await act(async () => {
    await flushMicrotasks();
  });
  await vi.waitFor(() => expect(second).not.toBeNull(), { timeout: 15_000 });
  expect(first).toBe(second);
  root.unmount();
});
