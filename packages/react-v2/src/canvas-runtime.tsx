import type { RuntimeOptions } from "@react-canvas/core-v2";
import type { ReactNode } from "react";
import { Canvas } from "./canvas.tsx";
import { CanvasProvider } from "./canvas-provider.tsx";

export type CanvasRuntimeProps = {
  width: number;
  height: number;
  children?: ReactNode;
  /** 传给 {@link CanvasProvider} → `initRuntime`（仅首次有效）。 */
  initOptions?: RuntimeOptions;
};

export function CanvasRuntime(props: CanvasRuntimeProps): ReactNode {
  const { width, height, children, initOptions } = props;
  return (
    <CanvasProvider initOptions={initOptions}>
      {({ isReady, runtime }) => {
        if (!isReady || !runtime) return null;
        return (
          <Canvas
            width={width}
            height={height}
            paragraphFontProvider={runtime.paragraphFontProvider}
            defaultParagraphFontFamily={runtime.defaultParagraphFontFamily}
          >
            {children}
          </Canvas>
        );
      }}
    </CanvasProvider>
  );
}
