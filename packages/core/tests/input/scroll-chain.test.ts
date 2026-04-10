import { beforeAll, describe, expect, it } from "vite-plus/test";

import { calculateLayoutRoot } from "../../src/layout/layout.ts";
import { initYoga } from "../../src/layout/yoga.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import {
  applyWheelToScrollViewChain,
  buildScrollViewChainFromHit,
  consumeScroll,
} from "../../src/input/scroll-chain.ts";
import { ScrollViewNode } from "../../src/scene/scroll-view-node.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("scroll-chain", () => {
  let yoga: Yoga;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("buildScrollViewChainFromHit is innermost-first", () => {
    const outer = new ScrollViewNode(yoga);
    const mid = new ViewNode(yoga, "View");
    const inner = new ScrollViewNode(yoga);
    const leaf = new ViewNode(yoga, "View");
    outer.appendChild(mid);
    mid.appendChild(inner);
    inner.appendChild(leaf);

    expect(buildScrollViewChainFromHit(leaf)).toEqual([inner, outer]);
    expect(buildScrollViewChainFromHit(mid)).toEqual([outer]);
    expect(buildScrollViewChainFromHit(outer)).toEqual([outer]);
  });

  it("consumeScroll vertical only changes scrollY; deltaX passes through", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 100, height: 200 });
    const sv = new ScrollViewNode(yoga);
    sv.setStyle({ width: 100, height: 80 });
    const content = new ViewNode(yoga, "View");
    content.setStyle({ width: 100, height: 200 });
    sv.appendChild(content);
    root.appendChild(sv);
    calculateLayoutRoot(root, 100, 200, yoga.DIRECTION_LTR);

    const r = consumeScroll(sv, 5, 10);
    expect(r.remainX).toBe(5);
    expect(r.remainY).toBe(0);
    expect(sv.scrollY).toBe(10);
    expect(sv.scrollX).toBe(0);
  });

  it("consumeScroll horizontal only changes scrollX; deltaY passes through", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 200, height: 100 });
    const sv = new ScrollViewNode(yoga);
    sv.horizontal = true;
    sv.setStyle({ width: 120, height: 100 });
    const content = new ViewNode(yoga, "View");
    content.setStyle({ width: 400, height: 100 });
    sv.appendChild(content);
    root.appendChild(sv);
    calculateLayoutRoot(root, 200, 100, yoga.DIRECTION_LTR);

    const r = consumeScroll(sv, 15, 8);
    expect(r.remainY).toBe(8);
    expect(r.remainX).toBe(0);
    expect(sv.scrollX).toBe(15);
    expect(sv.scrollY).toBe(0);
  });

  it("nested chain passes remainder to outer ScrollView", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 100, height: 300 });

    const outer = new ScrollViewNode(yoga);
    outer.setStyle({ width: 100, height: 200 });
    const outerContent = new ViewNode(yoga, "View");
    outerContent.setStyle({ width: 100, height: 500 });

    const inner = new ScrollViewNode(yoga);
    inner.setStyle({ width: 100, height: 120 });
    const innerContent = new ViewNode(yoga, "View");
    innerContent.setStyle({ width: 100, height: 400 });

    inner.appendChild(innerContent);
    outerContent.appendChild(inner);
    outer.appendChild(outerContent);
    root.appendChild(outer);

    calculateLayoutRoot(root, 100, 300, yoga.DIRECTION_LTR);

    const leaf = innerContent;
    const res = applyWheelToScrollViewChain(leaf, 0, 500);
    expect(res.inScrollView).toBe(true);
    expect(res.didScroll).toBe(true);
    expect(inner.scrollY).toBeGreaterThan(0);
    expect(outer.scrollY).toBeGreaterThan(0);
  });

  it("orthogonal: vertical inner then horizontal outer splits deltaX/deltaY", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 400, height: 300 });

    const outer = new ScrollViewNode(yoga);
    outer.horizontal = true;
    outer.setStyle({ width: 400, height: 300 });
    const outerContent = new ViewNode(yoga, "View");
    outerContent.setStyle({ width: 900, height: 300 });

    const inner = new ScrollViewNode(yoga);
    inner.setStyle({ width: 400, height: 300 });
    const innerContent = new ViewNode(yoga, "View");
    innerContent.setStyle({ width: 400, height: 600 });

    inner.appendChild(innerContent);
    outerContent.appendChild(inner);
    outer.appendChild(outerContent);
    root.appendChild(outer);

    calculateLayoutRoot(root, 400, 300, yoga.DIRECTION_LTR);

    applyWheelToScrollViewChain(innerContent, 40, 50);
    expect(inner.scrollY).toBeGreaterThan(0);
    expect(outer.scrollX).toBeGreaterThan(0);
  });

  it("overscrollBehavior contain stops chain at boundary", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 100, height: 300 });

    const outer = new ScrollViewNode(yoga);
    outer.setStyle({ width: 100, height: 200 });
    const outerContent = new ViewNode(yoga, "View");
    outerContent.setStyle({ width: 100, height: 500 });

    const inner = new ScrollViewNode(yoga);
    inner.overscrollBehavior = "contain";
    inner.setStyle({ width: 100, height: 120 });
    const innerContent = new ViewNode(yoga, "View");
    innerContent.setStyle({ width: 100, height: 400 });

    inner.appendChild(innerContent);
    outerContent.appendChild(inner);
    outer.appendChild(outerContent);
    root.appendChild(outer);

    calculateLayoutRoot(root, 100, 300, yoga.DIRECTION_LTR);

    inner.scrollY = inner.contentHeight - inner.viewportHeight;
    const outerBefore = outer.scrollY;

    const res = applyWheelToScrollViewChain(innerContent, 0, 200);
    expect(res.inScrollView).toBe(true);
    expect(outer.scrollY).toBe(outerBefore);
  });
});
