import { beforeAll, describe, expect, it } from "vite-plus/test";
import { initYoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("applyStylesToYoga + calculateLayout", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("row + flex 1: two children split width evenly (200px root)", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({
      width: 200,
      height: 200,
      flexDirection: "row",
    });
    const a = new ViewNode(yoga, "View");
    a.setStyle({ flex: 1, height: 50 });
    const b = new ViewNode(yoga, "View");
    b.setStyle({ flex: 1, height: 50 });
    root.appendChild(a);
    root.appendChild(b);
    root.calculateLayout(200, 200);
    expect(a.layout.width).toBe(100);
    expect(b.layout.width).toBe(100);
    expect(b.layout.left).toBe(100);
  });

  it("default column stacks children vertically", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 100, height: 200 });
    const a = new ViewNode(yoga, "View");
    a.setStyle({ height: 30, width: 100 });
    const b = new ViewNode(yoga, "View");
    b.setStyle({ height: 40, width: 100 });
    root.appendChild(a);
    root.appendChild(b);
    root.calculateLayout(100, 200);
    expect(a.layout.top).toBe(0);
    expect(b.layout.top).toBe(30);
  });

  it("percentage width on child fills parent", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 200, height: 100 });
    const child = new ViewNode(yoga, "View");
    child.setStyle({ width: "50%", height: 50 });
    root.appendChild(child);
    root.calculateLayout(200, 100);
    expect(child.layout.width).toBe(100);
  });
});
