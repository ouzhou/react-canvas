import { vi } from "vite-plus/test";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Node/jsdom 不加载 CanvasKit WASM：仅 mock 宿主挂载，保留真实 `createSceneRuntime` 等。 */
vi.mock("@react-canvas/core-v2", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@react-canvas/core-v2")>();
  return {
    ...mod,
    attachSceneSkiaPresenter: vi.fn().mockResolvedValue(() => {}),
    attachCanvasStagePointer: vi.fn().mockReturnValue(() => {}),
  };
});
