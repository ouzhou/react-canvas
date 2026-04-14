import { expect, test } from "vite-plus/test";

import { parseAngleToRadians } from "../src/layout/transform-rn.ts";

test("parseAngleToRadians parses deg and rad", () => {
  expect(parseAngleToRadians("90deg")).toBeCloseTo(Math.PI / 2, 6);
  expect(parseAngleToRadians("45deg")).toBeCloseTo(Math.PI / 4, 6);
  expect(parseAngleToRadians("1rad")).toBeCloseTo(1, 6);
});
