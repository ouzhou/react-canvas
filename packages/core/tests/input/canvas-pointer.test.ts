import { describe, expect, test } from "vite-plus/test";
import { clientToCanvasLogical } from "../../src/input/canvas-pointer.ts";

describe("clientToCanvasLogical", () => {
  test("maps client coordinates into logical canvas space", () => {
    const canvas = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
        width: 200,
        height: 100,
        right: 300,
        bottom: 150,
      }),
    } as unknown as HTMLCanvasElement;

    expect(clientToCanvasLogical(100, 50, canvas, 400, 200)).toEqual({ x: 0, y: 0 });
    expect(clientToCanvasLogical(300, 150, canvas, 400, 200)).toEqual({ x: 400, y: 200 });
    expect(clientToCanvasLogical(200, 100, canvas, 400, 200)).toEqual({ x: 200, y: 100 });
  });
});
