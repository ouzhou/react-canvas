import { describe, it, expect, beforeAll } from "vite-plus/test";
import { shouldEmitClick } from "../../src/input/click.ts";
import { initYoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("shouldEmitClick", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;
  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("returns false when moved beyond threshold", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const target = new ViewNode(yoga, "View");
    target.layout = { left: 0, top: 0, width: 100, height: 100 };
    root.appendChild(target);
    expect(shouldEmitClick({ pageX: 10, pageY: 10, target }, 30, 10, root, 10)).toBe(false);
  });

  it("returns false when release outside target box", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const target = new ViewNode(yoga, "View");
    target.layout = { left: 0, top: 0, width: 20, height: 20 };
    root.appendChild(target);
    expect(shouldEmitClick({ pageX: 10, pageY: 10, target }, 100, 100, root, 10)).toBe(false);
  });

  it("returns true for small move inside target", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const target = new ViewNode(yoga, "View");
    target.layout = { left: 0, top: 0, width: 100, height: 100 };
    root.appendChild(target);
    expect(shouldEmitClick({ pageX: 10, pageY: 10, target }, 12, 11, root, 10)).toBe(true);
  });
});
