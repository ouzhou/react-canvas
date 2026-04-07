import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { useKeyboardMonitor } from "../src/use-keyboard-monitor.ts";

function DisplaySimple() {
  const { isKeyDown } = useKeyboardMonitor();
  return <div id="kb-out">{isKeyDown("Space") ? "down" : "up"}</div>;
}

describe("useKeyboardMonitor", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(() => {
    root?.unmount();
    container?.remove();
  });

  it("tracks Space keydown and keyup", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<DisplaySimple />);
    });
    expect(container.querySelector("#kb-out")?.textContent).toBe("up");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
    });
    expect(container.querySelector("#kb-out")?.textContent).toBe("down");

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space", bubbles: true }));
    });
    expect(container.querySelector("#kb-out")?.textContent).toBe("up");
  });
});
