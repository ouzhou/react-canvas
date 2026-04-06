import { beforeAll, describe, expect, it } from "vite-plus/test";
import { initYoga } from "../../src/layout/yoga.ts";
import { TextNode } from "../../src/scene/text-node.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("TextNode tree", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;
  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("TextNode is linked under ViewNode", () => {
    const root = new ViewNode(yoga, "View");
    const t = new TextNode(yoga);
    root.appendChild(t);
    expect(root.children).toContain(t);
    expect(t.parent).toBe(root);
    expect(t.yogaMounted).toBe(true);
  });

  it("nested TextNode under Text is not yoga-mounted", () => {
    const outer = new TextNode(yoga);
    const inner = new TextNode(yoga);
    outer.appendChild(inner);
    expect(inner.yogaMounted).toBe(false);
    expect(outer.children).toContain(inner);
    expect(inner.parent).toBe(outer);
  });
});
