import { describe, it, expect, beforeAll } from "vite-plus/test";
import { shouldEmitClick } from "../../src/input/click.ts";
import { hitTestAmongLayerRoots } from "../../src/input/hit-test.ts";
import type { CanvasKit } from "canvaskit-wasm";
import { createMatrixMockCanvasKit } from "../helpers/matrix-mock-canvas-kit.ts";
import { initYoga } from "../../src/layout/yoga.ts";
import { TextNode } from "../../src/scene/text-node.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("shouldEmitClick", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;
  let canvasKit: CanvasKit;

  beforeAll(async () => {
    yoga = await initYoga();
    canvasKit = createMatrixMockCanvasKit();
  });

  it("returns false when moved beyond threshold", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const target = new ViewNode(yoga, "View");
    target.layout = { left: 0, top: 0, width: 100, height: 100 };
    root.appendChild(target);
    expect(shouldEmitClick({ pageX: 10, pageY: 10, target }, 30, 10, root, canvasKit, 10)).toBe(
      false,
    );
  });

  it("returns false when release outside target box", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const target = new ViewNode(yoga, "View");
    target.layout = { left: 0, top: 0, width: 20, height: 20 };
    root.appendChild(target);
    expect(shouldEmitClick({ pageX: 10, pageY: 10, target }, 100, 100, root, canvasKit, 10)).toBe(
      false,
    );
  });

  it("returns true for small move inside target", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const target = new ViewNode(yoga, "View");
    target.layout = { left: 0, top: 0, width: 100, height: 100 };
    root.appendChild(target);
    expect(shouldEmitClick({ pageX: 10, pageY: 10, target }, 12, 11, root, canvasKit, 10)).toBe(
      true,
    );
  });

  it("按下在父 View、抬起在子 Text 时仍发出 click（同一次交互）", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 200, height: 200 };
    const parent = new ViewNode(yoga, "View");
    parent.layout = { left: 0, top: 0, width: 120, height: 48 };
    const label = new TextNode(yoga);
    label.layout = { left: 0, top: 0, width: 120, height: 48 };
    root.appendChild(parent);
    parent.appendChild(label);
    expect(
      shouldEmitClick({ pageX: 10, pageY: 10, target: parent }, 11, 11, root, canvasKit, 10),
    ).toBe(true);
  });

  describe("多 Layer（弹窗与主场景同画布）", () => {
    it("按下与抬起均在顶层时发出 click，不因同坐标下层存在可点节点而穿透", () => {
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
      expect(hitTestAmongLayerRoots(roots, 60, 60, canvasKit)?.hit).toBe(modalBtn);

      const down = { pageX: 60, pageY: 60, target: modalBtn };
      expect(shouldEmitClick(down, 60, 60, roots, canvasKit)).toBe(true);
    });

    it("若抬起时命中结果不是按下目标（多根下上层消失等），不发出 click", () => {
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

      const down = { pageX: 60, pageY: 60, target: modalBtn };
      expect(shouldEmitClick(down, 60, 60, [defaultLayer], canvasKit)).toBe(false);
    });
  });
});
