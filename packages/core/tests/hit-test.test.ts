import { describe, it, expect, beforeAll } from "vite-plus/test";
import { hitTest, buildPathToRoot } from "../src/hit-test.ts";
import { initYoga } from "../src/yoga-init.ts";
import { TextNode } from "../src/text-node.ts";
import { ViewNode } from "../src/view-node.ts";

describe("hitTest", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;
  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("returns the deepest node containing the point", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const child = new ViewNode(yoga, "View");
    child.layout = { left: 10, top: 10, width: 80, height: 80 };
    root.appendChild(child);
    expect(hitTest(root, 50, 50)).toBe(child);
    expect(hitTest(root, 5, 5)).toBe(root);
  });

  it("prefers last sibling (top paint order) when overlapping", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 100, height: 100 };
    const a = new ViewNode(yoga, "View");
    a.layout = { left: 0, top: 0, width: 50, height: 50 };
    const b = new ViewNode(yoga, "View");
    b.layout = { left: 0, top: 0, width: 50, height: 50 };
    root.appendChild(a);
    root.appendChild(b);
    expect(hitTest(root, 10, 10)).toBe(b);
  });

  it("buildPathToRoot returns root-to-target chain", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 100, height: 100 };
    const child = new ViewNode(yoga, "View");
    child.layout = { left: 0, top: 0, width: 10, height: 10 };
    root.appendChild(child);
    expect(buildPathToRoot(child, root)).toEqual([root, child]);
  });

  it("nested Text: only outer TextNode is hittable (inner Text has no separate box in hit-test)", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const outer = new TextNode(yoga);
    outer.layout = { left: 10, top: 10, width: 160, height: 48 };
    const inner = new TextNode(yoga);
    root.appendChild(outer);
    outer.appendChild(inner);
    expect(hitTest(root, 50, 30)).toBe(outer);
    expect(hitTest(root, 100, 25)).toBe(outer);
  });
});
