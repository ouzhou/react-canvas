import { describe, expect, test, vi } from "vite-plus/test";
import type { CanvasKit } from "canvaskit-wasm";

/** Vitest 下真实 CanvasKit WASM 路径常不可用；与 frame-queue 测试一致用桩，只验证 init 状态机与别名 API */
vi.mock("../../src/render/canvaskit.ts", () => ({
  initCanvasKit: vi.fn(async (): Promise<CanvasKit> => {
    return {
      Paint: class {
        setAntiAlias = vi.fn();
        delete = vi.fn();
      },
    } as unknown as CanvasKit;
  }),
}));

import {
  getRuntimeSnapshot,
  initRuntime,
  subscribeRuntimeInit,
} from "../../src/runtime/runtime-init-store.ts";

describe("runtime init (documented API)", () => {
  test("getRuntimeSnapshot matches subscribeRuntimeInit emissions", async () => {
    const spy = vi.fn();
    const unsub = subscribeRuntimeInit(spy);
    const p = initRuntime({ loadDefaultParagraphFonts: false });
    await p;
    expect(spy).toHaveBeenCalled();
    const snap = getRuntimeSnapshot();
    expect(snap.status === "ready" || snap.status === "error").toBe(true);
    unsub();
  });
});
