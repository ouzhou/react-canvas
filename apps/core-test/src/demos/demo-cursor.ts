import type { CanvasSyntheticPointerEvent } from "@react-canvas/core";
import { TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * 节点链 `cursor` + `CursorManager` 优先级（node &lt; plugin），与 `core-design.md` §15 对齐。
 */
export async function mountCursorDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const host = await createStageDemoHost(container, 360, 240);
  const { runtime, stage, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 14,
    gap: 10,
    flexDirection: "column",
    backgroundColor: "#0c4a6e",
  });

  const cap = new TextNode(yoga);
  cap.setStyle({ fontSize: 11, color: "#bae6fd" });
  cap.appendTextSlot({
    nodeValue: "§15 光标管理 — CursorManager，node 与 plugin 优先级",
  });

  const mkStrip = (label: string, cursor: string) => {
    const v = new ViewNode(yoga, "View");
    v.setStyle({
      height: 56,
      borderRadius: 8,
      backgroundColor: "#082f49",
      justifyContent: "center",
      alignItems: "center",
      cursor,
    });
    const t = new TextNode(yoga);
    t.setStyle({ fontSize: 14, color: "#e0f2fe", textAlign: "center" });
    t.appendTextSlot({ nodeValue: `${label}（cursor: ${cursor}）` });
    v.appendChild(t);
    return v;
  };

  root.appendChild(cap);
  root.appendChild(mkStrip("区域一", "pointer"));
  root.appendChild(mkStrip("区域二", "text"));

  const grab = new ViewNode(yoga, "View");
  grab.setStyle({
    height: 64,
    borderRadius: 8,
    backgroundColor: "#155e75",
    justifyContent: "center",
    alignItems: "center",
    cursor: "grab",
  });
  const grabLabel = new TextNode(yoga);
  grabLabel.setStyle({ fontSize: 14, color: "#ecfeff", textAlign: "center" });
  grabLabel.appendTextSlot({
    nodeValue: "按下：plugin 光标 grabbing；抬起：释放",
  });
  grab.appendChild(grabLabel);

  let releasePluginCursor: (() => void) | null = null;
  grab.interactionHandlers = {
    onPointerDown: (e: CanvasSyntheticPointerEvent) => {
      stage.setPointerCapture(grab, e.pointerId);
      releasePluginCursor?.();
      releasePluginCursor = stage.cursorManager.set("grabbing", "plugin");
      onStatus("cursor：plugin 覆盖为 grabbing");
      stage.requestPaintOnly(sceneRoot);
    },
    onPointerUp: (e: CanvasSyntheticPointerEvent) => {
      stage.releasePointerCapture(grab, e.pointerId);
      releasePluginCursor?.();
      releasePluginCursor = null;
      onStatus("cursor：已释放 plugin，回退到 node 解析");
      stage.requestPaintOnly(sceneRoot);
    },
  };

  root.appendChild(grab);
  sceneRoot.appendChild(root);
  requestFrame();

  const detach = stage.attachPointerHandlers(sceneRoot);

  return () => {
    releasePluginCursor?.();
    detach();
    root.destroy();
    dispose();
  };
}
