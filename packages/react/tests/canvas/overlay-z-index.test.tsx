import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { act, useEffect, useRef, type MutableRefObject } from "react";
import { createRoot } from "react-dom/client";
import {
  allocateOverlayZIndex,
  CanvasProvider,
  OverlayZIndexProvider,
  useAllocateOverlayZIndex,
} from "../../src/index.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("allocateOverlayZIndex (fallback)", () => {
  it("returns strictly increasing values", () => {
    const a = allocateOverlayZIndex();
    const b = allocateOverlayZIndex();
    const c = allocateOverlayZIndex();
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });
});

function CaptureAlloc({
  outRef,
}: {
  outRef: MutableRefObject<{ first: number; second: number } | null>;
}) {
  const alloc = useAllocateOverlayZIndex();
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    outRef.current = { first: alloc(), second: alloc() };
  });
  return null;
}

describe("useAllocateOverlayZIndex", () => {
  it("scoped per OverlayZIndexProvider: two roots get independent sequences", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    const refA: MutableRefObject<{ first: number; second: number } | null> = { current: null };
    const refB: MutableRefObject<{ first: number; second: number } | null> = { current: null };

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    await act(async () => {
      root.render(
        <>
          <OverlayZIndexProvider>
            <CaptureAlloc outRef={refA} />
          </OverlayZIndexProvider>
          <OverlayZIndexProvider>
            <CaptureAlloc outRef={refB} />
          </OverlayZIndexProvider>
        </>,
      );
    });

    expect(refA.current).not.toBeNull();
    expect(refB.current).not.toBeNull();
    expect(refA.current!.first).toBe(1001);
    expect(refA.current!.second).toBe(1002);
    expect(refB.current!.first).toBe(1001);
    expect(refB.current!.second).toBe(1002);

    root.unmount();
    document.body.removeChild(el);
  });

  it("CanvasProvider wraps OverlayZIndexProvider so hook is scoped per provider", async () => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    const refA: MutableRefObject<{ first: number; second: number } | null> = { current: null };
    const refB: MutableRefObject<{ first: number; second: number } | null> = { current: null };

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);

    await act(async () => {
      root.render(
        <>
          <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
            {() => <CaptureAlloc outRef={refA} />}
          </CanvasProvider>
          <CanvasProvider runtimeOptions={{ loadDefaultParagraphFonts: false }}>
            {() => <CaptureAlloc outRef={refB} />}
          </CanvasProvider>
        </>,
      );
    });

    expect(refA.current?.first).toBe(1001);
    expect(refB.current?.first).toBe(1001);

    root.unmount();
    document.body.removeChild(el);
  });
});
