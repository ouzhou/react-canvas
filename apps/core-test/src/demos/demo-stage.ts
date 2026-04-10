import {
  attachCanvasPointerHandlers,
  type ViewportCamera,
  TextNode,
  ViewNode,
} from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * `docs/core-design.md` §3 Stage — 画布宿主：Surface、尺寸、ViewportCamera、getNodeWorldRect。
 */
export async function mountStageDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const host = await createStageDemoHost(container, 400, 240);
  const { runtime, stage, sceneRoot, canvas, dispose } = host;
  const { yoga, canvasKit } = runtime;

  const camera: ViewportCamera = { translateX: 0, translateY: 0, scale: 1 };

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 12,
    backgroundColor: "#422006",
  });

  const grid = new ViewNode(yoga, "View");
  grid.setStyle({ flexDirection: "row", flexWrap: "wrap", gap: 8 });

  const cells: ViewNode[] = [];
  for (let i = 0; i < 6; i++) {
    const c = new ViewNode(yoga, "View");
    c.setStyle({
      width: 72,
      height: 56,
      backgroundColor: i % 2 === 0 ? "#ca8a04" : "#a16207",
      borderRadius: 8,
    });
    grid.appendChild(c);
    cells.push(c);
  }

  const hint = new TextNode(yoga);
  hint.setStyle({ fontSize: 11, color: "#fde68a", marginTop: 6 });
  hint.appendTextSlot({
    nodeValue: "§3 Stage：相机矩阵与命中一致；「worldRect」取左上角格子的 getNodeWorldRect",
  });

  root.appendChild(grid);
  root.appendChild(hint);
  sceneRoot.appendChild(root);

  const paint = (): void => {
    stage.requestLayoutPaint(undefined, camera);
  };

  const tools = document.createElement("div");
  tools.className = "camera-tools";
  tools.innerHTML = `
    <button type="button" data-a="zoom-in">放大</button>
    <button type="button" data-a="zoom-out">缩小</button>
    <button type="button" data-a="left">左移</button>
    <button type="button" data-a="right">右移</button>
    <button type="button" data-a="reset">重置相机</button>
    <button type="button" data-a="world">worldRect</button>
  `;
  container.insertBefore(tools, container.firstChild);

  const syncStatus = (): void => {
    onStatus(
      `camera scale=${camera.scale.toFixed(2)} tx=${camera.translateX.toFixed(0)} ty=${camera.translateY.toFixed(0)} · stage ${stage.width}×${stage.height}`,
    );
  };

  tools.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest("button");
    if (!t) return;
    const a = t.getAttribute("data-a");
    if (a === "zoom-in") camera.scale = Math.min(3, camera.scale * 1.15);
    if (a === "zoom-out") camera.scale = Math.max(0.4, camera.scale / 1.15);
    if (a === "left") camera.translateX -= 24;
    if (a === "right") camera.translateX += 24;
    if (a === "reset") {
      camera.scale = 1;
      camera.translateX = 0;
      camera.translateY = 0;
    }
    if (a === "world") {
      const first = cells[0];
      if (first) {
        const r = stage.getNodeWorldRect(first);
        onStatus(
          `getNodeWorldRect(格1)：x=${r.x.toFixed(1)} y=${r.y.toFixed(1)} w=${r.width.toFixed(1)} h=${r.height.toFixed(1)}`,
        );
      }
      paint();
      return;
    }
    syncStatus();
    paint();
  });

  syncStatus();
  paint();

  const detach = attachCanvasPointerHandlers(
    canvas,
    sceneRoot,
    stage.width,
    stage.height,
    canvasKit,
    paint,
    () => camera,
  );

  return () => {
    detach();
    tools.remove();
    root.destroy();
    dispose();
  };
}
