import type { ReactNode } from "react";
import { Canvas } from "./canvas.tsx";
import { CanvasProvider } from "./canvas-provider.tsx";

export type CanvasRuntimeProps = {
  width: number;
  height: number;
  children?: ReactNode;
};

export function CanvasRuntime(props: CanvasRuntimeProps): ReactNode {
  const { width, height, children } = props;
  return (
    <CanvasProvider>
      {({ isReady }) =>
        isReady && (
          <Canvas width={width} height={height}>
            {children}
          </Canvas>
        )
      }
    </CanvasProvider>
  );
}
