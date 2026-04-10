import { TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

const SNIPPET = `// §11 独立使用 API（JS/TS）— 无 React
import { initCanvasRuntime, Stage, ViewNode, TextNode } from "@react-canvas/core";

const runtime = await initCanvasRuntime();
const { yoga } = runtime;
const stage = new Stage(runtime, {
  canvas: document.getElementById("c")!,
  width: 280,
  height: 120,
});
const card = new ViewNode(yoga);
card.setStyle({ padding: 12, backgroundColor: "#1e293b", borderRadius: 8 });
const t = new TextNode(yoga);
t.setStyle({ fontSize: 14, color: "#e2e8f0" });
t.appendTextSlot({ nodeValue: "Hello core" });
card.appendChild(t);
stage.defaultLayer.root.appendChild(card);
stage.requestLayoutPaint();`;

/**
 * 纯 JS 独立使用路径 + 文档 §11 代码对照，与 `core-design.md` §11 对齐。
 */
export async function mountStandaloneApiDemo(container: HTMLElement): Promise<() => void> {
  const shell = document.createElement("div");
  shell.className = "standalone-api-shell";

  const pre = document.createElement("pre");
  pre.className = "standalone-api-snippet";
  pre.setAttribute("aria-label", "§11 独立使用 API（JS/TS）代码摘录");
  pre.textContent = SNIPPET;

  const canvasMount = document.createElement("div");
  canvasMount.className = "standalone-api-canvas";

  shell.appendChild(pre);
  shell.appendChild(canvasMount);
  container.appendChild(shell);

  const host = await createStageDemoHost(canvasMount, 280, 120);
  const { runtime, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const card = new ViewNode(yoga, "View");
  card.setStyle({
    width: "100%",
    height: "100%",
    padding: 12,
    backgroundColor: "#1e293b",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "flex-start",
  });

  const t = new TextNode(yoga);
  t.setStyle({ fontSize: 14, color: "#e2e8f0" });
  t.appendTextSlot({
    nodeValue: "§11 独立使用 API（JS/TS）— 画布与左侧代码同一路径",
  });

  card.appendChild(t);
  sceneRoot.appendChild(card);
  requestFrame();

  return () => {
    dispose();
    shell.remove();
  };
}
