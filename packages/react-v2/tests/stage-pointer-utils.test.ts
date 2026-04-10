import { expect, test } from "vite-plus/test";
import { clientToStageLocal } from "../src/stage-pointer-utils.ts";

test("clientToStageLocal subtracts bounding rect origin", () => {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      top: 20,
      left: 10,
      right: 110,
      bottom: 70,
      toJSON: () => ({}),
    }) as DOMRect;
  expect(clientToStageLocal(el, 35, 55)).toEqual({ x: 25, y: 35 });
});
