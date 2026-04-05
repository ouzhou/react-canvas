import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Text } from "../src/text.ts";
import { View } from "../src/view.ts";
import { Canvas } from "../src/canvas.tsx";
import { CanvasProvider } from "../src/canvas-provider.tsx";
import { resetLayoutPaintQueueForTests } from "@react-canvas/core";

afterEach(() => {
  resetLayoutPaintQueueForTests();
  vi.unstubAllGlobals();
});

describe("Text host", () => {
  it("mounts <Text> with string child under <View>", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    await act(async () => {
      root.render(
        <StrictMode>
          <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
            {({ isReady, error }) => {
              if (error) return <div data-testid="e">{String(error.message)}</div>;
              if (!isReady) return <div data-testid="l">loading</div>;
              return (
                <Canvas width={100} height={40}>
                  <View style={{ width: 100, height: 40 }}>
                    <Text style={{ fontSize: 14, color: "#111" }}>hello</Text>
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
    expect(el.querySelector('[data-testid="e"]')).toBeNull();
    expect(el.querySelector("canvas")).toBeTruthy();
    root.unmount();
    el.remove();
  });

  it("R-HOST-4: raw text under <View> throws", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    await act(async () => {
      root.render(
        <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
          {({ isReady, error }) => {
            if (error) return <div data-testid="e">{String(error.message)}</div>;
            if (!isReady) return <div data-testid="l">loading</div>;
            return (
              <Canvas width={80} height={40}>
                <View style={{ width: 80, height: 40 }} />
              </Canvas>
            );
          }}
        </CanvasProvider>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });

    expect(() => {
      act(() => {
        root.render(
          <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
            {({ isReady, error }) => {
              if (error) return <div data-testid="e">{String(error.message)}</div>;
              if (!isReady) return <div data-testid="l">loading</div>;
              return (
                <Canvas width={80} height={40}>
                  <View style={{ width: 80, height: 40 }}>oops</View>
                </Canvas>
              );
            }}
          </CanvasProvider>,
        );
      });
    }).toThrow(/R-HOST-4/);

    root.unmount();
    el.remove();
  });

  it("R-HOST-2: <View> inside <Text> throws", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    await act(async () => {
      root.render(
        <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
          {({ isReady, error }) => {
            if (error) return <div data-testid="e">{String(error.message)}</div>;
            if (!isReady) return <div data-testid="l">loading</div>;
            return (
              <Canvas width={80} height={40}>
                <View style={{ width: 80, height: 40 }}>
                  <Text style={{ fontSize: 12 }}>ok</Text>
                </View>
              </Canvas>
            );
          }}
        </CanvasProvider>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });

    expect(() => {
      act(() => {
        root.render(
          <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
            {({ isReady, error }) => {
              if (error) return <div data-testid="e">{String(error.message)}</div>;
              if (!isReady) return <div data-testid="l">loading</div>;
              return (
                <Canvas width={80} height={40}>
                  <View style={{ width: 80, height: 40 }}>
                    <Text>
                      <View style={{ width: 10, height: 10 }} />
                    </Text>
                  </View>
                </Canvas>
              );
            }}
          </CanvasProvider>,
        );
      });
    }).toThrow(/R-HOST-2/);

    root.unmount();
    el.remove();
  });
});
