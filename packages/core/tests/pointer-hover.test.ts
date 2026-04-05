import { describe, it, expect, beforeAll } from "vite-plus/test";
import { diffHoverEnterLeave } from "../src/pointer-hover.ts";
import { initYoga } from "../src/yoga-init.ts";
import { ViewNode } from "../src/view-node.ts";

describe("diffHoverEnterLeave", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;
  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("leaves leaf-to-root slice and enters from common ancestor", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const a = new ViewNode(yoga, "View");
    a.layout = { left: 0, top: 0, width: 100, height: 100 };
    const b = new ViewNode(yoga, "View");
    b.layout = { left: 0, top: 0, width: 40, height: 40 };
    const c = new ViewNode(yoga, "View");
    c.layout = { left: 0, top: 0, width: 40, height: 40 };
    root.appendChild(a);
    a.appendChild(b);
    a.appendChild(c);

    const { leave, enter } = diffHoverEnterLeave(b, c, root);
    expect(leave).toEqual([b]);
    expect(enter).toEqual([c]);
  });

  it("full leave when next is null", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 100, height: 100 };
    const child = new ViewNode(yoga, "View");
    child.layout = { left: 0, top: 0, width: 50, height: 50 };
    root.appendChild(child);
    const { leave, enter } = diffHoverEnterLeave(child, null, root);
    expect(leave).toEqual([child, root]);
    expect(enter).toEqual([]);
  });
});
