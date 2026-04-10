import { TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * `docs/core-design.md` §6 布局引擎 — Yoga：Flex、absolute、padding、gap。
 */
export async function mountLayoutEngineDemo(container: HTMLElement): Promise<() => void> {
  const host = await createStageDemoHost(container, 400, 280);
  const { runtime, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 12,
    gap: 10,
    flexDirection: "column",
    backgroundColor: "#0c0a09",
  });

  const cap = new TextNode(yoga);
  cap.setStyle({ fontSize: 11, color: "#a8a29e" });
  cap.appendTextSlot({
    nodeValue:
      "§6 布局引擎 — calculateLayoutRoot / applyStylesToYoga；脏标记驱动 requestLayoutPaint（见 §10）",
  });

  const flexRow = new ViewNode(yoga, "View");
  flexRow.setStyle({
    flexDirection: "row",
    gap: 10,
    padding: 10,
    backgroundColor: "#1c1917",
    borderRadius: 10,
  });
  for (const c of ["#7c3aed", "#6d28d9", "#5b21b6"]) {
    const v = new ViewNode(yoga, "View");
    v.setStyle({ flex: 1, height: 56, backgroundColor: c, borderRadius: 8 });
    flexRow.appendChild(v);
  }

  const absWrap = new ViewNode(yoga, "View");
  absWrap.setStyle({
    height: 120,
    backgroundColor: "#292524",
    borderRadius: 10,
    position: "relative",
  });

  const absChild = new ViewNode(yoga, "View");
  absChild.setStyle({
    position: "absolute",
    left: 24,
    top: 20,
    width: 140,
    height: 72,
    backgroundColor: "#ea580c",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  });
  const absLabel = new TextNode(yoga);
  absLabel.setStyle({ fontSize: 12, color: "#fff7ed" });
  absLabel.appendTextSlot({ nodeValue: "position:absolute" });
  absChild.appendChild(absLabel);
  absWrap.appendChild(absChild);

  const foot = new TextNode(yoga);
  foot.setStyle({ fontSize: 11, color: "#78716c" });
  foot.appendTextSlot({
    nodeValue: "上：Flex+gap；下：绝对定位子节点（Yoga absolute）",
  });

  root.appendChild(cap);
  root.appendChild(flexRow);
  root.appendChild(absWrap);
  root.appendChild(foot);

  sceneRoot.appendChild(root);
  requestFrame();

  return () => {
    root.destroy();
    dispose();
  };
}
