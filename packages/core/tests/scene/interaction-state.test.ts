import { describe, expect, test, vi } from "vite-plus/test";

import { initYoga } from "../../src/layout/yoga.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";

describe("ViewNode interaction state", () => {
  test("applyInteractionPatch is idempotent for identical values", async () => {
    const yoga: Yoga = await initYoga();
    const n = new ViewNode(yoga, "View");
    const fn = vi.fn();
    n.onInteractionStateChange = fn;
    n.applyInteractionPatch({ hovered: false });
    expect(fn).not.toHaveBeenCalled();
  });

  test("applyInteractionPatch notifies subscribers", async () => {
    const yoga: Yoga = await initYoga();
    const n = new ViewNode(yoga, "View");
    const fn = vi.fn();
    n.onInteractionStateChange = fn;
    n.applyInteractionPatch({ hovered: true });
    expect(fn).toHaveBeenCalledWith(
      expect.objectContaining({ hovered: true, pressed: false, focused: false }),
    );
  });

  test("beginPointerPress / endPointerPress use depth", async () => {
    const yoga: Yoga = await initYoga();
    const n = new ViewNode(yoga, "View");
    n.beginPointerPress();
    n.beginPointerPress();
    expect(n.interactionState.pressed).toBe(true);
    n.endPointerPress();
    expect(n.interactionState.pressed).toBe(true);
    n.endPointerPress();
    expect(n.interactionState.pressed).toBe(false);
    n.endPointerPress();
    expect(n.interactionState.pressed).toBe(false);
  });
});
