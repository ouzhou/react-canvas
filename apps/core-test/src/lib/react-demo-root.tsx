import { Canvas, CanvasProvider } from "@react-canvas/react";
import { StrictMode, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";

export type ReactDemoSize = { width: number; height: number };

/**
 * 在 `container` 内 `createRoot`，挂载 `CanvasProvider` → ready 后 `<Canvas><Scene/></Canvas>`。
 * @returns cleanup：`root.unmount()` + `container.replaceChildren()`。
 */
export function mountReactCanvasDemo(
  container: HTMLElement,
  size: ReactDemoSize,
  Scene: ComponentType<ReactDemoSize>,
): () => void {
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
            <Canvas width={size.width} height={size.height}>
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
