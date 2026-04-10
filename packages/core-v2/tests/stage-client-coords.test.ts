import { expect, test } from "vite-plus/test";
import { clientXYToStageLocal } from "../src/input/stage-client-coords.ts";

test("clientXYToStageLocal subtracts viewport origin", () => {
  expect(clientXYToStageLocal({ left: 10, top: 20 }, 35, 55)).toEqual({ x: 25, y: 35 });
});
