export type SkiaSceneRenderer = {
  dispose(): void;
};

export function createSkiaSceneRenderer(_options: {
  width: number;
  height: number;
}): SkiaSceneRenderer {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[@react-canvas/react-v2] Skia renderer is not implemented (stub).");
  }
  return {
    dispose() {},
  };
}
