import { describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CanvasThemeProvider, useCanvasToken } from "../src/theme/context.tsx";
import type { CanvasToken } from "../src/theme/types.ts";

describe("CanvasThemeProvider", () => {
  it("provides dark token", async () => {
    const tokenRef: { current: CanvasToken | null } = { current: null };
    function Probe() {
      tokenRef.current = useCanvasToken();
      return null;
    }
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(
        <CanvasThemeProvider theme={{ appearance: "dark" }}>
          <Probe />
        </CanvasThemeProvider>,
      );
    });
    expect(tokenRef.current?.colorBgLayout).toBe("#141414");
    root.unmount();
    el.remove();
  });

  it("nested child theme overrides appearance", async () => {
    const tokenRef: { current: CanvasToken | null } = { current: null };
    function Probe() {
      tokenRef.current = useCanvasToken();
      return null;
    }
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(
        <CanvasThemeProvider theme={{ appearance: "light" }}>
          <CanvasThemeProvider theme={{ appearance: "dark" }}>
            <Probe />
          </CanvasThemeProvider>
        </CanvasThemeProvider>,
      );
    });
    expect(tokenRef.current?.colorBgLayout).toBe("#141414");
    root.unmount();
    el.remove();
  });

  it("useCanvasToken throws without provider", async () => {
    function Bad() {
      useCanvasToken();
      return null;
    }
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await expect(
      act(async () => {
        root.render(<Bad />);
      }),
    ).rejects.toThrow(/useCanvasToken must be used within CanvasThemeProvider/);
    root.unmount();
    el.remove();
  });
});
