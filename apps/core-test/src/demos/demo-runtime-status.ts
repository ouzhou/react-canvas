import { getCanvasRuntimeInitSnapshot, TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * 展示 `getCanvasRuntimeInitSnapshot` 在 `createStageDemoHost` → `initCanvasRuntime` 前后的变化。
 */
export async function mountRuntimeStatusDemo(
  container: HTMLElement,
  onStatus: (html: string) => void,
): Promise<() => void> {
  const snap0 = getCanvasRuntimeInitSnapshot();
  onStatus(`初始化前：<code>${snap0.status}</code>`);

  const host = await createStageDemoHost(container, 360, 80);
  const snap1 = getCanvasRuntimeInitSnapshot();
  onStatus(
    `初始化后：<code>${snap1.status}</code>（<code>createStageDemoHost</code> 内 <code>initCanvasRuntime</code>）`,
  );

  const { runtime, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const v = new ViewNode(yoga, "View");
  v.setStyle({
    width: "100%",
    height: "100%",
    backgroundColor: "#14532d",
    justifyContent: "center",
  });
  const t = new TextNode(yoga);
  t.setStyle({ fontSize: 14, color: "#bbf7d0" });
  t.appendTextSlot({ nodeValue: "§2 Runtime — 运行时初始化 · Stage / WASM 就绪" });
  v.appendChild(t);
  sceneRoot.appendChild(v);
  requestFrame();

  return () => {
    v.destroy();
    dispose();
  };
}
