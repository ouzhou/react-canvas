import { beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { paintNode } from "../src/paint.ts";
import { initYoga } from "../src/yoga-init.ts";
import { ViewNode } from "../src/view-node.ts";

describe("paintNode", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  function mockKitAndPaint() {
    const paint = {
      setColor: vi.fn(),
      setStyle: vi.fn(),
      setAntiAlias: vi.fn(),
      setStrokeWidth: vi.fn(),
      setAlphaf: vi.fn(),
      copy: vi.fn(() => ({
        setAlphaf: vi.fn(),
        setAntiAlias: vi.fn(),
        delete: vi.fn(),
      })),
      delete: vi.fn(),
    };
    const canvasKit = {
      TRANSPARENT: 0,
      parseColorString: vi.fn(() => 0xff0000ff),
      PaintStyle: { Fill: 0, Stroke: 1 },
      LTRBRect: vi.fn((l: number, t: number, r: number, b: number) => ({ l, t, r, b })),
      RRectXY: vi.fn((r: unknown) => r),
    };
    return { paint, canvasKit };
  }

  it("does not draw when display is none", () => {
    const skCanvas = {
      save: vi.fn(),
      restore: vi.fn(),
      drawRect: vi.fn(),
      drawRRect: vi.fn(),
      saveLayer: vi.fn(),
    };
    const { paint, canvasKit } = mockKitAndPaint();
    const node = new ViewNode(yoga, "View");
    node.setStyle({ display: "none", width: 50, height: 50, backgroundColor: "#f00" });
    node.calculateLayout(100, 100);
    paintNode(node, skCanvas as never, canvasKit as never, paint as never, 0, 0);
    expect(skCanvas.drawRect).not.toHaveBeenCalled();
    expect(skCanvas.drawRRect).not.toHaveBeenCalled();
  });

  it("draws rect for visible node with backgroundColor", () => {
    const skCanvas = {
      save: vi.fn(),
      restore: vi.fn(),
      drawRect: vi.fn(),
      drawRRect: vi.fn(),
      saveLayer: vi.fn(),
    };
    const { paint, canvasKit } = mockKitAndPaint();
    const node = new ViewNode(yoga, "View");
    node.setStyle({ width: 40, height: 30, backgroundColor: "#00ff00" });
    node.calculateLayout(100, 100);
    paintNode(node, skCanvas as never, canvasKit as never, paint as never, 0, 0);
    expect(skCanvas.drawRect).toHaveBeenCalled();
  });
});
