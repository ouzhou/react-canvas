import type { ViewportCamera } from "@react-canvas/core";
import { Canvas, CanvasProvider, type CanvasProps } from "@react-canvas/react";
import { StrictMode, type ComponentType, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

export type ReactDemoSize = { width: number; height: number };

export type MountReactCanvasOptions = Pick<CanvasProps, "camera" | "onStageReady">;

/**
 * 仅 `StrictMode` + `createRoot`，用于自带 `CanvasProvider` 的复杂 demo（工具条、多段文案等）。
 */
export function mountReactApp(container: HTMLElement, tree: ReactNode): () => void {
  container.replaceChildren();
  const root: Root = createRoot(container);
  root.render(<StrictMode>{tree}</StrictMode>);
  return () => {
    root.unmount();
    container.replaceChildren();
  };
}

/**
 * 在 `container` 内 `createRoot`，挂载 `CanvasProvider` → ready 后 `<Canvas><Scene/></Canvas>`。
 * @returns cleanup：`root.unmount()` + `container.replaceChildren()`。
 */
export function mountReactCanvasDemo(
  container: HTMLElement,
  size: ReactDemoSize,
  Scene: ComponentType<ReactDemoSize>,
  options?: MountReactCanvasOptions,
): () => void {
  const camera: ViewportCamera | null = options?.camera ?? null;
  const onStageReady = options?.onStageReady;
  container.replaceChildren();
  const root: Root = createRoot(container);
  root.render(
    <StrictMode>
      <CanvasProvider>
        {({ isReady, error }) => {
          if (error) {
            return (
              <div role="alert" className="impl-react-error">
                {String(error.message)}
              </div>
            );
          }
          if (!isReady) {
            return (
              <div aria-busy="true" className="impl-react-loading">
                Loading…
              </div>
            );
          }
          return (
            <Canvas
              width={size.width}
              height={size.height}
              camera={camera}
              onStageReady={onStageReady}
            >
              <Scene width={size.width} height={size.height} />
            </Canvas>
          );
        }}
      </CanvasProvider>
    </StrictMode>,
  );

  return () => {
    root.unmount();
    container.replaceChildren();
  };
}
