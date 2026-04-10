import { TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

const BULLETS = [
  "§13 待决问题（摘录 core-design.md）",
  "13.1 多 Layer 时 Reconciler 根：每 Layer 独立 vs 单根。",
  "13.2 Portal → modalLayer：Context 传 Stage 还是传 Layer。",
  "13.3 跨 Layer 锚点：getNodeWorldRect + overlay 绝对定位。",
  "13.4 ScrollView 水平滚动：deltaX、horizontal API 待定。",
  "13.5 PointerCapture：节点稳定 id（symbol）建议。",
  "13.6 首帧文字抖动：等字体 vs 接受跳动。",
  "13.7 currentStyle 缓存：命令式 updateStyle 易用性。",
];

/**
 * `docs/core-design.md` §13 待决问题 — 画布内条目列表。
 */
export async function mountPendingIssuesDemo(container: HTMLElement): Promise<() => void> {
  const host = await createStageDemoHost(container, 400, 300);
  const { runtime, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 12,
    gap: 5,
    flexDirection: "column",
    backgroundColor: "#18181b",
  });

  for (const line of BULLETS) {
    const t = new TextNode(yoga);
    t.setStyle({ fontSize: 11, color: "#d4d4d8", lineHeight: 1.35 });
    t.appendTextSlot({ nodeValue: line });
    root.appendChild(t);
  }

  sceneRoot.appendChild(root);
  requestFrame();

  return () => {
    root.destroy();
    dispose();
  };
}
