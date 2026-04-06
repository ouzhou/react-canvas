import { beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { paintNode } from "../../src/render/paint.ts";
import { initYoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

function multiply3x3(a: number[], b: number[]): number[] {
  const r = Array.from({ length: 9 }, () => 0);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
      }
    }
  }
  return r;
}

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
      Matrix: {
        identity: () => [1, 0, 0, 0, 1, 0, 0, 0, 1],
        translated: (dx: number, dy: number) => [1, 0, dx, 0, 1, dy, 0, 0, 1],
        multiply: (...parts: number[][]) => {
          if (parts.length === 0) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
          return parts.reduce((acc, p) => multiply3x3(acc, p));
        },
        rotated: (rad: number, _px?: number, _py?: number) => {
          const c = Math.cos(rad);
          const s = Math.sin(rad);
          return [c, -s, 0, s, c, 0, 0, 0, 1];
        },
        scaled: (sx: number, sy: number, _px?: number, _py?: number) => [
          sx,
          0,
          0,
          0,
          sy,
          0,
          0,
          0,
          1,
        ],
        skewed: (_kx: number, _ky: number, _px?: number, _py?: number) => [
          1, 0, 0, 0, 1, 0, 0, 0, 1,
        ],
      },
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
      concat: vi.fn(),
    };
    const { paint, canvasKit } = mockKitAndPaint();
    const node = new ViewNode(yoga, "View");
    node.setStyle({ display: "none", width: 50, height: 50, backgroundColor: "#f00" });
    node.calculateLayout(100, 100);
    paintNode(node, skCanvas as never, canvasKit as never, paint as never);
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
      concat: vi.fn(),
    };
    const { paint, canvasKit } = mockKitAndPaint();
    const node = new ViewNode(yoga, "View");
    node.setStyle({ width: 40, height: 30, backgroundColor: "#00ff00" });
    node.calculateLayout(100, 100);
    paintNode(node, skCanvas as never, canvasKit as never, paint as never);
    expect(skCanvas.drawRect).toHaveBeenCalled();
  });
});
