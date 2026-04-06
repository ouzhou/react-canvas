/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vite-plus/test";
import { act, createRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useClickAway } from "../src/hooks/use-click-away.ts";

function firePointerDown(target: EventTarget, options?: PointerEventInit): void {
  target.dispatchEvent(
    new PointerEvent("pointerdown", { bubbles: true, cancelable: true, ...options }),
  );
}

describe("useClickAway", () => {
  it("invokes onAway when pointerdown outside domRefs", async () => {
    const away = vi.fn();
    const insideRef = createRef<HTMLDivElement>();

    function Probe() {
      useClickAway(away, { enabled: true, domRefs: insideRef });
      return (
        <div ref={insideRef} data-testid="inside">
          in
        </div>
      );
    }

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(<Probe />);
    });

    const inside = el.querySelector('[data-testid="inside"]') as HTMLElement;
    const outside = document.createElement("button");
    document.body.appendChild(outside);

    await act(async () => {
      firePointerDown(inside);
    });
    expect(away).not.toHaveBeenCalled();

    await act(async () => {
      firePointerDown(outside);
    });
    expect(away).toHaveBeenCalledTimes(1);

    root.unmount();
    outside.remove();
    el.remove();
  });

  it("with ignoreCanvas, does not invoke when target is canvas", async () => {
    const away = vi.fn();

    function Probe() {
      useClickAway(away, { enabled: true, ignoreCanvas: true });
      return null;
    }

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(<Probe />);
    });

    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    await act(async () => {
      firePointerDown(canvas);
    });
    expect(away).not.toHaveBeenCalled();

    const btn = document.createElement("button");
    document.body.appendChild(btn);
    await act(async () => {
      firePointerDown(btn);
    });
    expect(away).toHaveBeenCalledTimes(1);

    root.unmount();
    canvas.remove();
    btn.remove();
    el.remove();
  });

  it("does not register when enabled is false", async () => {
    const away = vi.fn();

    function Toggler() {
      const [on, setOn] = useState(false);
      useClickAway(away, { enabled: on });
      return (
        <button type="button" onClick={() => setOn(true)}>
          on
        </button>
      );
    }

    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(<Toggler />);
    });

    const outside = document.createElement("span");
    document.body.appendChild(outside);
    await act(async () => {
      firePointerDown(outside);
    });
    expect(away).not.toHaveBeenCalled();

    const btn = el.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    await act(async () => {
      firePointerDown(outside);
    });
    expect(away).toHaveBeenCalledTimes(1);

    root.unmount();
    outside.remove();
    el.remove();
  });
});
