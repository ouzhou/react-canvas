import { beforeAll, describe, expect, it } from "vite-plus/test";
import { calculateLayoutRoot } from "../src/layout/layout.ts";
import { initYoga } from "../src/layout/yoga.ts";
import { ScrollViewNode } from "../src/scene/scroll-view-node.ts";
import { ViewNode } from "../src/scene/view-node.ts";

describe("ScrollViewNode clampScrollOffsetsAfterLayout", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("clamps scrollY to max(contentHeight - viewportHeight, 0)", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 200, height: 400 });

    const scroll = new ScrollViewNode(yoga);
    scroll.setStyle({ width: 200, height: 100 });
    const content = new ViewNode(yoga, "View");
    content.setStyle({ width: 200, height: 300 });
    scroll.appendChild(content);
    root.appendChild(scroll);

    calculateLayoutRoot(root, 200, 400, yoga.DIRECTION_LTR);

    scroll.scrollY = 999;
    scroll.clampScrollOffsetsAfterLayout();
    expect(scroll.scrollY).toBe(200);

    scroll.scrollY = -10;
    scroll.clampScrollOffsetsAfterLayout();
    expect(scroll.scrollY).toBe(0);
  });

  it("maxScrollY is 0 when content is shorter than viewport", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 100, height: 200 });

    const scroll = new ScrollViewNode(yoga);
    scroll.setStyle({ width: 100, height: 100 });
    const content = new ViewNode(yoga, "View");
    content.setStyle({ width: 100, height: 50 });
    scroll.appendChild(content);
    root.appendChild(scroll);

    calculateLayoutRoot(root, 100, 200, yoga.DIRECTION_LTR);

    scroll.scrollY = 50;
    scroll.clampScrollOffsetsAfterLayout();
    expect(scroll.scrollY).toBe(0);
  });

  it("calculateLayoutRoot runs clamp so scrollY stays valid after layout", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 100, height: 200 });

    const scroll = new ScrollViewNode(yoga);
    scroll.setStyle({ width: 100, height: 80 });
    const content = new ViewNode(yoga, "View");
    content.setStyle({ width: 100, height: 200 });
    scroll.appendChild(content);
    root.appendChild(scroll);

    scroll.scrollY = 500;
    calculateLayoutRoot(root, 100, 200, yoga.DIRECTION_LTR);
    expect(scroll.scrollY).toBe(120);
  });
});
