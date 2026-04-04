import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act, Component, type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { View } from "../src/view.ts";
import { Canvas } from "../src/canvas.tsx";
import { CanvasProvider } from "../src/canvas-provider.tsx";
import { resetLayoutPaintQueueForTests } from "../src/queue-layout-paint-frame.ts";

afterEach(() => {
  resetLayoutPaintQueueForTests();
  vi.unstubAllGlobals();
});

class TestErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state: { message: string | null } = { message: null };

  static getDerivedStateFromError(e: Error): { message: string } {
    return { message: e.message };
  }

  render() {
    return this.state.message ? (
      <span data-testid="caught">{this.state.message}</span>
    ) : (
      this.props.children
    );
  }
}

describe("Canvas + View", () => {
  it("throws when two <View> are direct children of <Canvas>", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    await act(async () => {
      root.render(
        <TestErrorBoundary>
          <CanvasProvider>
            {({ isReady, error }) => {
              if (error) return <div data-testid="e">{String(error.message)}</div>;
              if (!isReady) return <div data-testid="l">loading</div>;
              return (
                <Canvas width={100} height={100}>
                  <View style={{ flex: 1 }} />
                  <View style={{ flex: 1 }} />
                </Canvas>
              );
            }}
          </CanvasProvider>
        </TestErrorBoundary>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500));
    });

    expect(el.querySelector('[data-testid="caught"]')?.textContent).toMatch(/exactly one child/);

    root.unmount();
    el.remove();
  });

  it("mounts single View under CanvasProvider (WASM)", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    const ready = { current: false };

    await act(async () => {
      root.render(
        <StrictMode>
          <CanvasProvider>
            {({ isReady, error }) => {
              if (error) return <div data-testid="e">{String(error.message)}</div>;
              if (!isReady) return <div data-testid="l">loading</div>;
              ready.current = true;
              return (
                <Canvas width={120} height={80}>
                  <View
                    style={{
                      width: 120,
                      height: 80,
                      flexDirection: "row",
                    }}
                  >
                    <View style={{ flex: 1, height: 40 }} />
                    <View style={{ flex: 1, height: 40 }} />
                  </View>
                </Canvas>
              );
            }}
          </CanvasProvider>
        </StrictMode>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    expect(ready.current).toBe(true);
    expect(el.querySelector("canvas")).toBeTruthy();

    root.unmount();
    el.remove();
  });
});
