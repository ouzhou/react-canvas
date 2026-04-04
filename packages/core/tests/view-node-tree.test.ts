import { beforeAll, describe, expect, it } from "vite-plus/test";
import { initYoga } from "../src/yoga-init.ts";
import { ViewNode } from "../src/view-node.ts";

describe("ViewNode", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("appendChild links yoga tree and children array", () => {
    const parent = new ViewNode(yoga, "View");
    const child = new ViewNode(yoga, "View");
    parent.appendChild(child);
    expect(parent.children).toContain(child);
    expect(child.parent).toBe(parent);
    expect(parent.yogaNode.getChildCount()).toBe(1);
  });

  it("destroy frees yoga subtree", () => {
    const root = new ViewNode(yoga, "View");
    const a = new ViewNode(yoga, "View");
    root.appendChild(a);
    root.destroy();
    expect(root.children.length).toBe(0);
  });

  it("insertBefore reorders siblings and keeps yoga child count", () => {
    const parent = new ViewNode(yoga, "View");
    const a = new ViewNode(yoga, "View");
    const b = new ViewNode(yoga, "View");
    parent.appendChild(a);
    parent.appendChild(b);
    parent.insertBefore(b, a);
    expect(parent.children).toEqual([b, a]);
    expect(parent.yogaNode.getChildCount()).toBe(2);
  });

  it("insertBefore(child, child) is a no-op", () => {
    const parent = new ViewNode(yoga, "View");
    const a = new ViewNode(yoga, "View");
    parent.appendChild(a);
    parent.insertBefore(a, a);
    expect(parent.children).toEqual([a]);
    expect(parent.yogaNode.getChildCount()).toBe(1);
  });

  it("removeChild detaches from parent and yoga", () => {
    const parent = new ViewNode(yoga, "View");
    const child = new ViewNode(yoga, "View");
    parent.appendChild(child);
    parent.removeChild(child);
    expect(parent.children).toEqual([]);
    expect(child.parent).toBeNull();
    expect(parent.yogaNode.getChildCount()).toBe(0);
  });

  it("removeChild is a no-op when child is not a direct child", () => {
    const parent = new ViewNode(yoga, "View");
    const other = new ViewNode(yoga, "View");
    parent.removeChild(other);
    expect(parent.children).toEqual([]);
  });

  it("insertBefore moves node from another parent", () => {
    const p1 = new ViewNode(yoga, "View");
    const p2 = new ViewNode(yoga, "View");
    const a = new ViewNode(yoga, "View");
    const b = new ViewNode(yoga, "View");
    p1.appendChild(a);
    p2.appendChild(b);
    p2.insertBefore(a, b);
    expect(p1.children).toEqual([]);
    expect(p2.children).toEqual([a, b]);
    expect(a.parent).toBe(p2);
  });

  it("updateStyle returns early when styles are unchanged", () => {
    const n = new ViewNode(yoga, "View");
    n.setStyle({ width: 20, height: 10 });
    const style = { width: 20, height: 10 };
    n.dirty = false;
    n.updateStyle(style, style);
    expect(n.dirty).toBe(false);
  });

  it("updateStyle merges and marks dirty when a key changes", () => {
    const n = new ViewNode(yoga, "View");
    n.setStyle({ width: 20, height: 10 });
    n.dirty = false;
    n.updateStyle({ width: 20, height: 10 }, { width: 40, height: 10 });
    expect(n.dirty).toBe(true);
    n.calculateLayout(100, 100);
    expect(n.layout.width).toBe(40);
  });

  it("updateStyle on a node with parent and children does not throw (Yoga 3 forbids reset())", () => {
    const root = new ViewNode(yoga, "View");
    const mid = new ViewNode(yoga, "View");
    const leaf = new ViewNode(yoga, "View");
    root.appendChild(mid);
    mid.appendChild(leaf);
    mid.setStyle({ width: 100, flexDirection: "row" });
    mid.dirty = false;
    mid.updateStyle({ width: 100, flexDirection: "row" }, { width: 200, flexDirection: "row" });
    expect(mid.dirty).toBe(true);
    mid.calculateLayout(400, 400);
    expect(mid.layout.width).toBe(200);
  });
});
