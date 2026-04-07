import { describe, expect, it } from "vitest";
import { clientToCanvasLogical } from "../src/client-to-logical.ts";

describe("clientToCanvasLogical", () => {
  it("maps top-left of canvas to 0,0 in logical space", () => {
    const canvas = document.createElement("canvas");
    canvas.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20,
        width: 100,
        height: 50,
        right: 110,
        bottom: 70,
        x: 10,
        y: 20,
        toJSON: () => ({}),
      }) as DOMRect;

    expect(clientToCanvasLogical(10, 20, canvas, 200, 100)).toEqual({ x: 0, y: 0 });
    expect(clientToCanvasLogical(110, 70, canvas, 200, 100)).toEqual({ x: 200, y: 100 });
  });
});
