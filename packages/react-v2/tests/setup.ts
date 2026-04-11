import { vi } from "vite-plus/test";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** jsdom 不加载 CanvasKit WASM：替换 `initCanvasKit`，使 `initRuntime` 仍能更新快照。 */
vi.mock("../../core-v2/src/render/canvaskit.ts", () => ({
  initCanvasKit: vi.fn().mockResolvedValue({}),
}));

/** Node/jsdom：mock 画布挂载与 Skia presenter，保留真实 `initRuntime` / `createSceneRuntime`。 */
vi.mock("@react-canvas/core-v2", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@react-canvas/core-v2")>();
  return {
    ...mod,
    attachSceneSkiaPresenter: vi.fn().mockResolvedValue(() => {}),
    attachCanvasStagePointer: vi.fn().mockReturnValue(() => {}),
  };
});
