import { TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * `docs/core-design.md` §12 包边界 — core 可独立于 React；本 app 仅依赖 `@react-canvas/core`。
 */
export async function mountPackageBoundaryDemo(container: HTMLElement): Promise<() => void> {
  const shell = document.createElement("div");
  shell.className = "package-boundary-shell";

  const pre = document.createElement("pre");
  pre.className = "package-boundary-pre";
  pre.textContent = `// §12 包边界 — apps/core-test 仅：
import { … } from "@react-canvas/core";

// 不直接依赖 react / yoga-layout / canvaskit 包名；
// WASM 由 core 内 initCanvasRuntime 统一加载。`;

  const canvasMount = document.createElement("div");
  canvasMount.className = "package-boundary-canvas";

  shell.appendChild(pre);
  shell.appendChild(canvasMount);
  container.appendChild(shell);

  const host = await createStageDemoHost(canvasMount, 320, 100);
  const { runtime, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 12,
    backgroundColor: "#14532d",
    justifyContent: "center",
    alignItems: "center",
  });
  const t = new TextNode(yoga);
  t.setStyle({ fontSize: 13, color: "#bbf7d0" });
  t.appendTextSlot({ nodeValue: "仅 @react-canvas/core 即可跑 Stage + 节点" });
  root.appendChild(t);
  sceneRoot.appendChild(root);
  requestFrame();

  return () => {
    dispose();
    shell.remove();
  };
}
