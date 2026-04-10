import { attachCanvasPointerHandlers, TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * `docs/core-design.md` §8 事件系统 — 命中、onClick、冒泡（子→父）。
 */
export async function mountEventsDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const host = await createStageDemoHost(container, 400, 260);
  const { runtime, stage, sceneRoot, canvas, requestFrame, dispose } = host;
  const { yoga, canvasKit } = runtime;

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
    nodeValue:
      "§8 事件系统 — attachCanvasPointerHandlers；下方日志追加打印，可观察冒泡顺序（内层先于外层）",
  });

  const row = new ViewNode(yoga, "View");
  row.setStyle({ flexDirection: "row", gap: 10, flex: 1, minHeight: 0 });

  const mkButton = (label: string, color: string) => {
    const v = new ViewNode(yoga, "View");
    v.setStyle({
      flex: 1,
      minHeight: 64,
      backgroundColor: color,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    });
    const t = new TextNode(yoga);
    t.setStyle({ fontSize: 15, color: "#f8fafc", textAlign: "center" });
    t.appendTextSlot({ nodeValue: label });
    v.appendChild(t);
    v.interactionHandlers = {
      onClick: () => {
        onStatus(`独立按钮：${label}`);
      },
    };
    return v;
  };

  row.appendChild(mkButton("A", "#0369a1"));
  row.appendChild(mkButton("B", "#0d9488"));

  const outer = new ViewNode(yoga, "View");
  outer.setStyle({
    padding: 14,
    backgroundColor: "#155e75",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 100,
  });
  outer.interactionHandlers = {
    onClick: () => {
      onStatus("冒泡：外层 onClick（若先点内层，会先内后外）");
    },
  };

  const inner = new ViewNode(yoga, "View");
  inner.setStyle({
    padding: 12,
    backgroundColor: "#0e7490",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  });
  inner.interactionHandlers = {
    onClick: () => {
      onStatus("冒泡：内层 onClick");
    },
  };
  const innerT = new TextNode(yoga);
  innerT.setStyle({ fontSize: 13, color: "#ecfeff" });
  innerT.appendTextSlot({ nodeValue: "点我（内层）" });
  inner.appendChild(innerT);
  outer.appendChild(inner);

  root.appendChild(cap);
  root.appendChild(row);
  root.appendChild(outer);

  sceneRoot.appendChild(root);
  requestFrame();

  const detach = attachCanvasPointerHandlers(
    canvas,
    sceneRoot,
    stage.width,
    stage.height,
    canvasKit,
    () => {
      stage.requestLayoutPaint(sceneRoot);
    },
  );

  return () => {
    detach();
    root.destroy();
    dispose();
  };
}
