import { describe, expect, it } from "vite-plus/test";
import { act, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { useCanvasRuntime } from "../../src/canvas/context.ts";

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

describe("CanvasRuntimeContext", () => {
  it("useCanvasRuntime errors without CanvasProvider (caught by boundary)", async () => {
    function Probe() {
      useCanvasRuntime();
      return null;
    }
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(
        <TestErrorBoundary>
          <Probe />
        </TestErrorBoundary>,
      );
    });
    expect(el.querySelector('[data-testid="caught"]')?.textContent).toMatch(/R-ROOT-1/);
    root.unmount();
    el.remove();
  });
});
