import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act, useEffect, type MutableRefObject } from "react";
import { createRoot } from "react-dom/client";
import { CanvasProvider, useCanvasRuntime } from "../../src/index.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

function CaptureRuntime({
  storeRef,
}: {
  storeRef: MutableRefObject<{ yoga: unknown; canvasKit: unknown } | null>;
}) {
  const rt = useCanvasRuntime();
  useEffect(() => {
    storeRef.current = { yoga: rt.yoga, canvasKit: rt.canvasKit };
  });
  return null;
}

describe("multi CanvasProvider", () => {
  it("shares yoga and canvasKit references across providers", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    const refA: MutableRefObject<{ yoga: unknown; canvasKit: unknown } | null> = {
      current: null,
    };
    const refB: MutableRefObject<{ yoga: unknown; canvasKit: unknown } | null> = {
      current: null,
    };

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    await act(async () => {
      root.render(
        <>
          <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
            {({ isReady, error }) => {
              if (error) return <div data-testid="e1">{error.message}</div>;
              if (!isReady) return <div data-testid="l1">loading</div>;
              return <CaptureRuntime storeRef={refA} />;
            }}
          </CanvasProvider>
          <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
            {({ isReady, error }) => {
              if (error) return <div data-testid="e2">{error.message}</div>;
              if (!isReady) return <div data-testid="l2">loading</div>;
              return <CaptureRuntime storeRef={refB} />;
            }}
          </CanvasProvider>
        </>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500));
    });

    expect(refA.current).toBeTruthy();
    expect(refB.current).toBeTruthy();
    expect(refA.current!.yoga).toBe(refB.current!.yoga);
    expect(refA.current!.canvasKit).toBe(refB.current!.canvasKit);

    root.unmount();
    el.remove();
  });

  it("does not throw when font-related runtimeOptions conflict; may warn in dev", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    await act(async () => {
      root.render(
        <>
          <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
            {({ isReady, error }) => {
              if (error) return <div data-testid="e1">{error.message}</div>;
              if (!isReady) return <div data-testid="l1">loading</div>;
              return <span data-testid="a">a</span>;
            }}
          </CanvasProvider>
          <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: true }}>
            {({ isReady, error }) => {
              if (error) return <div data-testid="e2">{error.message}</div>;
              if (!isReady) return <div data-testid="l2">loading</div>;
              return <span data-testid="b">b</span>;
            }}
          </CanvasProvider>
        </>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 1500));
    });

    expect(el.querySelector('[data-testid="e1"]')).toBeNull();
    expect(el.querySelector('[data-testid="e2"]')).toBeNull();
    expect(el.querySelector('[data-testid="a"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="b"]')).toBeTruthy();

    warnSpy.mockRestore();
    root.unmount();
    el.remove();
  });
});
