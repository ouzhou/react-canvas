import { describe, it, expect, beforeAll } from "vite-plus/test";
import type { CanvasSyntheticPointerEvent } from "../../src/input/types.ts";
import { dispatchBubble } from "../../src/input/dispatch.ts";
import { initYoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("dispatchBubble", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;
  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("invokes bubble order leaf-to-root and respects stopPropagation", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 100, height: 100 };
    const child = new ViewNode(yoga, "View");
    child.layout = { left: 0, top: 0, width: 50, height: 50 };
    root.appendChild(child);

    const order: string[] = [];
    child.interactionHandlers = {
      onClick: (e: CanvasSyntheticPointerEvent) => {
        order.push("child");
        e.stopPropagation();
      },
    };
    root.interactionHandlers = {
      onClick: () => {
        order.push("root");
      },
    };

    const path = [root, child];
    dispatchBubble(path, root, "click", 10, 10, 1, 0);
    expect(order).toEqual(["child"]);
  });

  it("calls root after child when not stopped", () => {
    const root = new ViewNode(yoga, "View");
    root.layout = { left: 0, top: 0, width: 100, height: 100 };
    const child = new ViewNode(yoga, "View");
    child.layout = { left: 0, top: 0, width: 50, height: 50 };
    root.appendChild(child);

    const order: string[] = [];
    child.interactionHandlers = { onClick: () => order.push("child") };
    root.interactionHandlers = { onClick: () => order.push("root") };

    dispatchBubble([root, child], root, "click", 10, 10, 1, 0);
    expect(order).toEqual(["child", "root"]);
  });
});
