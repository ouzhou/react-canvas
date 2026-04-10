import { describe, it, expect, beforeAll } from "vite-plus/test";
import { hitTest, hitTestAmongLayerRoots, buildPathToRoot } from "../../src/index.ts";
import type { CanvasKit } from "canvaskit-wasm";
import { createMatrixMockCanvasKit } from "../helpers/matrix-mock-canvas-kit.ts";
import { initYoga } from "../../src/layout/yoga.ts";
import { TextNode } from "../../src/scene/text-node.ts";
import { ScrollViewNode } from "../../src/scene/scroll-view-node.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("hitTest", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;
  let canvasKit: CanvasKit;

  beforeAll(async () => {
    yoga = await initYoga();
    canvasKit = createMatrixMockCanvasKit();
  });

  it("returns the deepest node containing the point", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const child = new ViewNode(yoga, "View");
    child.layout = { left: 10, top: 10, width: 80, height: 80 };
    root.appendChild(child);
    expect(hitTest(root, 50, 50, canvasKit)).toBe(child);
    expect(hitTest(root, 5, 5, canvasKit)).toBe(root);
  });

  it("applies inverse ViewportCamera so hit matches paintScene concat order (translate)", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const child = new ViewNode(yoga, "View");
    child.layout = { left: 10, top: 10, width: 80, height: 80 };
    root.appendChild(child);
    const cam = { translateX: 10, translateY: 20, scale: 1 };
    expect(hitTest(root, 50, 50, canvasKit, cam)).toBe(child);
    expect(hitTest(root, 60, 70, canvasKit, cam)).toBe(child);
    expect(hitTest(root, 5, 5, canvasKit, cam)).toBe(null);
  });

  it("applies inverse ViewportCamera for uniform scale", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const child = new ViewNode(yoga, "View");
    child.layout = { left: 10, top: 10, width: 80, height: 80 };
    root.appendChild(child);
    const cam = { translateX: 0, translateY: 0, scale: 2 };
    expect(hitTest(root, 100, 100, canvasKit, cam)).toBe(child);
    expect(hitTest(root, 19, 19, canvasKit, cam)).toBe(root);
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
    expect(hitTest(root, 10, 10, canvasKit)).toBe(b);
  });

  it("prefers higher zIndex over later sibling when overlapping", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 100, height: 100 };
    const a = new ViewNode(yoga, "View");
    a.setStyle({ zIndex: 10 });
    a.layout = { left: 0, top: 0, width: 50, height: 50 };
    const b = new ViewNode(yoga, "View");
    b.layout = { left: 0, top: 0, width: 50, height: 50 };
    root.appendChild(a);
    root.appendChild(b);
    expect(hitTest(root, 10, 10, canvasKit)).toBe(a);
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
    expect(hitTest(root, 50, 30, canvasKit)).toBe(outer);
    expect(hitTest(root, 100, 25, canvasKit)).toBe(outer);
  });

  it("overflow hidden: miss outside rounded corner, hit inside", () => {
    const card = new ViewNode(yoga, "View");
    card.setStyle({ overflow: "hidden", borderRadius: 10, width: 100, height: 100 });
    card.layout = { left: 0, top: 0, width: 100, height: 100 };
    const inner = new ViewNode(yoga, "View");
    inner.layout = { left: 0, top: 0, width: 100, height: 100 };
    card.appendChild(inner);
    expect(hitTest(card, 2, 2, canvasKit)).toBe(null);
    expect(hitTest(card, 50, 50, canvasKit)).toBe(inner);
  });

  it("ScrollView: scrollY keeps child hit aligned with visible content", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const scroll = new ScrollViewNode(yoga);
    scroll.layout = { left: 0, top: 0, width: 100, height: 100 };
    scroll.scrollY = 80;
    const content = new ViewNode(yoga, "View");
    content.layout = { left: 0, top: 0, width: 100, height: 300 };
    scroll.appendChild(content);
    root.appendChild(scroll);
    expect(hitTest(root, 50, 50, canvasKit)).toBe(content);
  });

  it("respects translate transform for hit target", () => {
    const root = new ViewNode(yoga, "View");
    root.setStyle({ width: "100%", height: "100%" });
    const box = new ViewNode(yoga, "View");
    box.setStyle({
      width: 40,
      height: 40,
      transform: [{ translateX: 50 }, { translateY: 30 }],
    });
    root.appendChild(box);
    root.calculateLayout(200, 200, canvasKit);
    expect(hitTest(root, 10, 10, canvasKit)).toBe(root);
    expect(hitTest(root, 55, 35, canvasKit)).toBe(box);
  });

  describe("hitTestAmongLayerRoots (Stage 多 Layer / 弹窗)", () => {
    it("重叠区域命中 zIndex 更高的一层，不穿透到下层", () => {
      const defaultLayer = new ViewNode(yoga, "View");
      defaultLayer.layout = { left: 0, top: 0, width: 200, height: 200 };
      const behindBtn = new ViewNode(yoga, "View");
      behindBtn.layout = { left: 50, top: 50, width: 80, height: 80 };
      defaultLayer.appendChild(behindBtn);

      const modalLayer = new ViewNode(yoga, "View");
      modalLayer.layout = { left: 0, top: 0, width: 200, height: 200 };
      const modalBtn = new ViewNode(yoga, "View");
      modalBtn.layout = { left: 50, top: 50, width: 80, height: 80 };
      modalLayer.appendChild(modalBtn);

      const roots = [defaultLayer, modalLayer] as const;
      expect(hitTest(defaultLayer, 60, 60, canvasKit)).toBe(behindBtn);

      const picked = hitTestAmongLayerRoots(roots, 60, 60, canvasKit);
      expect(picked?.layerRoot).toBe(modalLayer);
      expect(picked?.hit).toBe(modalBtn);
    });

    it("上层未覆盖的区域仍命中下层", () => {
      const defaultLayer = new ViewNode(yoga, "View");
      defaultLayer.layout = { left: 0, top: 0, width: 200, height: 200 };
      const leaf = new ViewNode(yoga, "View");
      leaf.layout = { left: 10, top: 10, width: 40, height: 40 };
      defaultLayer.appendChild(leaf);

      const modalLayer = new ViewNode(yoga, "View");
      modalLayer.layout = { left: 100, top: 100, width: 50, height: 50 };
      const modalChild = new ViewNode(yoga, "View");
      modalChild.layout = { left: 0, top: 0, width: 50, height: 50 };
      modalLayer.appendChild(modalChild);

      const roots = [defaultLayer, modalLayer] as const;
      expect(hitTestAmongLayerRoots(roots, 20, 20, canvasKit)?.hit).toBe(leaf);
      expect(hitTestAmongLayerRoots(roots, 120, 120, canvasKit)?.hit).toBe(modalChild);
    });
  });
});
