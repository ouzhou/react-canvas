import { describe, expect, test } from "vite-plus/test";

import { initYoga } from "../../src/layout/yoga.ts";
import type { Yoga } from "../../src/layout/yoga.ts";
import { ViewNode } from "../../src/scene/view-node.ts";
import { FocusManager } from "../../src/stage/focus-manager.ts";

describe("FocusManager", () => {
  test("focus moves focused flag; blur clears", async () => {
    const yoga: Yoga = await initYoga();
    const a = new ViewNode(yoga, "View");
    const b = new ViewNode(yoga, "View");
    const fm = new FocusManager();

    fm.focus(a);
    expect(fm.focusedNode).toBe(a);
    expect(a.interactionState.focused).toBe(true);
    expect(b.interactionState.focused).toBe(false);

    fm.focus(b);
    expect(fm.focusedNode).toBe(b);
    expect(a.interactionState.focused).toBe(false);
    expect(b.interactionState.focused).toBe(true);

    fm.blur();
    expect(fm.focusedNode).toBeNull();
    expect(b.interactionState.focused).toBe(false);
  });

  test("onPointerDownHit(null) blurs", async () => {
    const yoga: Yoga = await initYoga();
    const a = new ViewNode(yoga, "View");
    const fm = new FocusManager();
    fm.focus(a);
    fm.onPointerDownHit(null);
    expect(fm.focusedNode).toBeNull();
    expect(a.interactionState.focused).toBe(false);
  });

  test("onPointerDownHit with focusable: false blurs", async () => {
    const yoga: Yoga = await initYoga();
    const a = new ViewNode(yoga, "View");
    a.props.focusable = false;
    const fm = new FocusManager();
    fm.focus(a);
    fm.onPointerDownHit(a);
    expect(fm.focusedNode).toBeNull();
    expect(a.interactionState.focused).toBe(false);
  });
});
