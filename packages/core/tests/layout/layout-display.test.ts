import { beforeAll, describe, expect, it } from "vite-plus/test";
import { Display } from "yoga-layout/load";
import { calculateLayoutRoot, isDisplayNone, syncLayoutFromYoga } from "../../src/layout/layout.ts";
import { initYoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("layout helpers", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("isDisplayNone is true when props.display is none", () => {
    const n = new ViewNode(yoga, "View");
    n.setStyle({ display: "none", width: 10, height: 10 });
    expect(isDisplayNone(n)).toBe(true);
  });

  it("isDisplayNone is true when yoga display is none", () => {
    const n = new ViewNode(yoga, "View");
    n.setStyle({ width: 10, height: 10 });
    n.yogaNode.setDisplay(Display.None);
    expect(isDisplayNone(n)).toBe(true);
  });

  it("isDisplayNone is false for default flex view", () => {
    const n = new ViewNode(yoga, "View");
    n.setStyle({ width: 10, height: 10, display: "flex" });
    expect(isDisplayNone(n)).toBe(false);
  });

  it("calculateLayoutRoot + syncLayoutFromYoga fills nested layout", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: 100, height: 80 });
    const child = new ViewNode(yoga, "View");
    child.setStyle({ width: 40, height: 30 });
    root.appendChild(child);
    calculateLayoutRoot(root, 100, 80, yoga.DIRECTION_LTR);
    expect(root.layout).toMatchObject({ width: 100, height: 80, left: 0, top: 0 });
    expect(child.layout.width).toBe(40);
    expect(child.layout.height).toBe(30);
    syncLayoutFromYoga(root);
    expect(child.layout.width).toBe(40);
  });
});
