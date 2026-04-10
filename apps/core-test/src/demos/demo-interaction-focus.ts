import { TextNode, ViewNode, type InteractionState } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

function applyFocusVisual(node: ViewNode, s: InteractionState): void {
  const borderColor = s.focused ? "#fbbf24" : s.hovered ? "#38bdf8" : "#475569";
  const backgroundColor = s.pressed ? "#1e3a5f" : s.hovered ? "#0f172a" : "#1e293b";
  node.setStyle({
    flex: 1,
    minHeight: 88,
    borderRadius: 10,
    borderWidth: 3,
    borderColor,
    backgroundColor,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  });
}

/**
 * `FocusManager` + `interactionState`（hover / pressed / focused），与 `core-design.md` §14 对齐。
 */
export async function mountInteractionFocusDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const host = await createStageDemoHost(container, 360, 220);
  const { runtime, stage, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 14,
    gap: 12,
    flexDirection: "column",
    backgroundColor: "#0f172a",
  });

  const cap = new TextNode(yoga);
  cap.setStyle({ fontSize: 11, color: "#94a3b8" });
  cap.appendTextSlot({
    nodeValue: "§14 伪类模拟系统 — interactionState：hover / pressed / focused",
  });

  const row = new ViewNode(yoga, "View");
  row.setStyle({ flexDirection: "row", gap: 12, flex: 1 });

  const mkPanel = (label: string) => {
    const v = new ViewNode(yoga, "View");
    v.setStyle({ cursor: "pointer" });
    applyFocusVisual(v, v.interactionState);
    const t = new TextNode(yoga);
    t.setStyle({ fontSize: 14, color: "#e2e8f0", textAlign: "center" });
    t.appendTextSlot({ nodeValue: label });
    v.appendChild(t);
    v.onInteractionStateChange = (s: InteractionState) => {
      applyFocusVisual(v, s);
      onStatus(`「${label}」hovered=${s.hovered} pressed=${s.pressed} focused=${s.focused}`);
      stage.requestPaintOnly(sceneRoot);
    };
    return v;
  };

  const a = mkPanel("可聚焦 A");
  const b = mkPanel("可聚焦 B");
  row.appendChild(a);
  row.appendChild(b);
  root.appendChild(cap);
  root.appendChild(row);

  sceneRoot.appendChild(root);
  requestFrame();

  const detach = stage.attachPointerHandlers(sceneRoot);

  return () => {
    detach();
    a.onInteractionStateChange = undefined;
    b.onInteractionStateChange = undefined;
    root.destroy();
    dispose();
  };
}
