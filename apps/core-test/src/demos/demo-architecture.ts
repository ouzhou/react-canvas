import { TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

const LINES = [
  "§1 整体架构 · 分层（core-design.md §1.1）",
  "用户代码：View / Text / Image / ScrollView（RN 风格）",
  "  → @react-canvas/ui → @react-canvas/react",
  "  → @react-canvas/core（Stage / Layer / 布局 / 渲染 / 事件）",
  "  → yoga-layout（WASM）+ canvaskit-wasm（Skia）",
  "本页以下各 tab 按目录 §2–§18 逐项验收。",
];

/**
 * `docs/core-design.md` §1 整体架构 — 分层示意（画布内文字）。
 */
export async function mountArchitectureDemo(container: HTMLElement): Promise<() => void> {
  const host = await createStageDemoHost(container, 400, 260);
  const { runtime, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 14,
    gap: 6,
    flexDirection: "column",
    backgroundColor: "#0f172a",
    justifyContent: "flex-start",
  });

  for (const line of LINES) {
    const t = new TextNode(yoga);
    t.setStyle({ fontSize: 12, color: "#cbd5e1", lineHeight: 1.35 });
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
