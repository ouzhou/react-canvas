import { expect, test } from "vite-plus/test";

import { isPaintOnlyStylePatch } from "../src/layout/style-map.ts";

test("isPaintOnlyStylePatch accepts 仅绘制类字段", () => {
  expect(
    isPaintOnlyStylePatch({
      backgroundLinearGradient: { angleRad: 0.5, colors: ["#ff0000", "#00ff00"] },
    }),
  ).toBe(true);
  expect(
    isPaintOnlyStylePatch({
      backgroundRadialGradient: { radiusScale: 0.7, colors: ["#ff0000", "#00ff00"] },
    }),
  ).toBe(true);
  expect(isPaintOnlyStylePatch({ backgroundColor: "#eee", opacity: 0.9 })).toBe(true);
  expect(isPaintOnlyStylePatch({ width: 12 })).toBe(false);
  expect(isPaintOnlyStylePatch({})).toBe(false);
});
