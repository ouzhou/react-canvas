import { describe, expect, it } from "vitest";
import { clientToCanvasLogical, logicalToCanvasClient } from "../src/client-to-logical.ts";

function mockRect(): DOMRect {
  return {
    left: 10,
    top: 20,
    width: 100,
    height: 50,
    right: 110,
    bottom: 70,
    x: 10,
    y: 20,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("clientToCanvasLogical / logicalToCanvasClient", () => {
  it("round-trips corners", () => {
    const canvas = document.createElement("canvas");
    canvas.getBoundingClientRect = () => mockRect();

    const lw = 200;
    const lh = 100;
    const a = clientToCanvasLogical(10, 20, canvas, lw, lh);
    expect(a).toEqual({ x: 0, y: 0 });
    const b = logicalToCanvasClient(a.x, a.y, canvas, lw, lh);
    expect(b.x).toBeCloseTo(10, 5);
    expect(b.y).toBeCloseTo(20, 5);

    const c = clientToCanvasLogical(110, 70, canvas, lw, lh);
    const d = logicalToCanvasClient(c.x, c.y, canvas, lw, lh);
    expect(d.x).toBeCloseTo(110, 5);
    expect(d.y).toBeCloseTo(70, 5);
  });
});
