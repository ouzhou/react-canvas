import { describe, it, expect, beforeAll } from "vite-plus/test";
import { initYoga } from "../../src/layout/yoga.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";
import { TextNode } from "../../src/scene/text-node.ts";

/**
 * 模拟 cursor demo 场景：带事件处理器的父节点（grab）包含子文本节点（label），
 * 点击命中文本节点，但 `pressed` 状态应传播到父链全部节点。
 *
 * 对应 `core-design.md` §14：InteractionState 与 DOM `:active` 伪类语义一致，
 * 按下子节点时父节点也应进入 `pressed` 状态。
 */
describe("pressed state propagation along ancestor chain", () => {
  let yoga: Yoga;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  /**
   * Stage.attachPointerHandlers 当前的 onPressBegin / onPressEnd 逻辑：
   * 只在命中叶节点上调用 beginPointerPress / endPointerPress。
   *
   * 这意味着如果用户点击 button 内的 text，button.pressed 永远是 false。
   */
  it("BUG: clicking text inside button should make button.pressed=true", () => {
    const sceneRoot = new ViewNode(yoga, "View");
    const button = new ViewNode(yoga, "View");
    const label = new TextNode(yoga);
    sceneRoot.appendChild(button);
    button.appendChild(label);

    // 模拟 cursor demo: handler 在 button 上，但命中点在 label 上
    button.interactionHandlers = {
      onPointerDown: () => {},
      onPointerUp: () => {},
    };

    const hit = label; // hitTest 返回最深节点

    // 模拟 Stage.onPressBegin: 沿命中节点向上传播 pressed 状态
    let n: ViewNode | null = hit;
    while (n) {
      n.beginPointerPress();
      n = n.parent as ViewNode | null;
    }

    // 核心断言：button（handler 所在节点）也应为 pressed
    expect(label.interactionState.pressed).toBe(true);
    expect(button.interactionState.pressed).toBe(true);

    // 模拟 Stage.onPressEnd: 沿同一路径释放
    n = hit;
    while (n) {
      n.endPointerPress();
      n = n.parent as ViewNode | null;
    }

    expect(label.interactionState.pressed).toBe(false);
    expect(button.interactionState.pressed).toBe(false);
  });

  it("concurrent multi-touch: two children under same parent keep parent pressed until both release", () => {
    const parent = new ViewNode(yoga, "View");
    const childA = new ViewNode(yoga, "View");
    const childB = new ViewNode(yoga, "View");
    parent.appendChild(childA);
    parent.appendChild(childB);

    // Finger 1 presses childA
    let n: ViewNode | null = childA;
    while (n) {
      n.beginPointerPress();
      n = n.parent as ViewNode | null;
    }
    expect(parent.interactionState.pressed).toBe(true);

    // Finger 2 presses childB（parent.pressDepth=2）
    n = childB;
    while (n) {
      n.beginPointerPress();
      n = n.parent as ViewNode | null;
    }
    expect(parent.interactionState.pressed).toBe(true);

    // Finger 1 releases childA（parent.pressDepth=1, still pressed）
    n = childA;
    while (n) {
      n.endPointerPress();
      n = n.parent as ViewNode | null;
    }
    expect(childA.interactionState.pressed).toBe(false);
    expect(parent.interactionState.pressed).toBe(true);

    // Finger 2 releases childB（parent.pressDepth=0, released）
    n = childB;
    while (n) {
      n.endPointerPress();
      n = n.parent as ViewNode | null;
    }
    expect(childB.interactionState.pressed).toBe(false);
    expect(parent.interactionState.pressed).toBe(false);
  });
});
