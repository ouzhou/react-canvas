import { vi } from "vite-plus/test";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * jsdom / Node 不加载 CanvasKit WASM：`initRuntime` 仍会调用 `initCanvasKit`，此处提供空实现。
 * `scene-skia-presenter` 在真实环境下会 `await initCanvasKit()` 再绘图；测试里直接 noop，避免对 stub 跑 Skia API。
 */
vi.mock("../../core-v2/src/render/canvaskit.ts", () => ({
  initCanvasKit: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../core-v2/src/render/scene-skia-presenter.ts", () => ({
  attachSceneSkiaPresenter: vi.fn().mockResolvedValue(() => {}),
}));
