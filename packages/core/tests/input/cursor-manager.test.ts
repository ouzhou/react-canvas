import { describe, expect, test } from "vite-plus/test";

import { CursorManager } from "../../src/input/cursor-manager.ts";

describe("CursorManager", () => {
  test("resolve defaults to default", () => {
    const cm = new CursorManager();
    expect(cm.resolve()).toBe("default");
  });

  test("setFromNode updates node layer", () => {
    const cm = new CursorManager();
    cm.setFromNode("pointer");
    expect(cm.resolve()).toBe("pointer");
    cm.setFromNode("");
    expect(cm.resolve()).toBe("default");
  });

  test("plugin overrides node", () => {
    const cm = new CursorManager();
    cm.setFromNode("pointer");
    const release = cm.set("grabbing", "plugin");
    expect(cm.resolve()).toBe("grabbing");
    release();
    expect(cm.resolve()).toBe("pointer");
  });

  test("system overrides plugin", () => {
    const cm = new CursorManager();
    cm.setFromNode("pointer");
    const relP = cm.set("grabbing", "plugin");
    const relS = cm.set("crosshair", "system");
    expect(cm.resolve()).toBe("crosshair");
    relS();
    expect(cm.resolve()).toBe("grabbing");
    relP();
    expect(cm.resolve()).toBe("pointer");
  });

  test("reset clears stacks and node", () => {
    const cm = new CursorManager();
    cm.setFromNode("pointer");
    cm.set("wait", "system");
    cm.reset();
    expect(cm.resolve()).toBe("default");
  });
});
