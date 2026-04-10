import { afterEach, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import type { CanvasKit } from "canvaskit-wasm";

import { attachCanvasPointerHandlers } from "../../src/input/canvas-pointer.ts";
import { createMatrixMockCanvasKit } from "../helpers/matrix-mock-canvas-kit.ts";
import { initYoga } from "../../src/layout/yoga.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("pointer capture routing", () => {
  let yoga: Yoga;
  let canvasKit: CanvasKit;

  beforeAll(async () => {
    yoga = await initYoga();
    canvasKit = createMatrixMockCanvasKit();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pointermove uses capture target and skips hit when capture is set", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const inner = new ViewNode(yoga, "View");
    inner.layout = { left: 10, top: 10, width: 40, height: 40 };
    root.appendChild(inner);

    const moves: number[] = [];
    inner.interactionHandlers = {
      onPointerMove: () => {
        moves.push(1);
      },
    };

    const captureMap = new Map<number, ViewNode>();
    const canvas = {
      width: 200,
      height: 200,
      style: { cursor: "" },
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 200,
        height: 200,
        right: 200,
        bottom: 200,
      }),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;

    const docListeners = new Map<string, Set<(ev: PointerEvent) => void>>();
    const documentStub = {
      addEventListener: vi.fn((type: string, fn: (ev: PointerEvent) => void) => {
        let set = docListeners.get(type);
        if (!set) {
          set = new Set();
          docListeners.set(type, set);
        }
        set.add(fn);
      }),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("document", documentStub);

    const canvasListeners = new Map<string, (ev: PointerEvent | WheelEvent) => void>();
    (
      canvas as unknown as { addEventListener: (type: string, fn: (ev: Event) => void) => void }
    ).addEventListener = (type: string, fn: (ev: Event) => void) => {
      canvasListeners.set(type, fn as (ev: PointerEvent | WheelEvent) => void);
    };

    const requestLayoutPaint = vi.fn();
    attachCanvasPointerHandlers(canvas, root, 200, 200, canvasKit, requestLayoutPaint, undefined, {
      getTarget: (id) => captureMap.get(id),
      release: (id) => {
        captureMap.delete(id);
      },
    });

    const down = canvasListeners.get("pointerdown");
    expect(down).toBeDefined();
    down!({
      pointerId: 42,
      clientX: 20,
      clientY: 20,
      pointerType: "mouse",
      timeStamp: 0,
    } as unknown as PointerEvent);

    captureMap.set(42, inner);

    const move = [...docListeners.get("pointermove")!][0]!;
    move({
      pointerId: 42,
      clientX: 300,
      clientY: 300,
      pointerType: "mouse",
      timeStamp: 1,
    } as unknown as PointerEvent);

    expect(moves).toEqual([1]);
  });
});
