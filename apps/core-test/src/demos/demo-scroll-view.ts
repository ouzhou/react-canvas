import { hitTest, ScrollViewNode, ViewNode } from "@react-canvas/core";

import { clientToCanvasLogical } from "../lib/client-to-logical.ts";
import { createDemoHost } from "../lib/demo-host.ts";

function findAncestorScrollView(leaf: ViewNode | null): ScrollViewNode | null {
  let n: ViewNode | null = leaf;
  while (n) {
    if (n.type === "ScrollView") return n as ScrollViewNode;
    if (n.parent === null) break;
    n = n.parent as ViewNode;
  }
  return null;
}

export async function mountScrollViewDemo(container: HTMLElement): Promise<() => void> {
  const host = await createDemoHost(container, 360, 220);
  const { runtime, canvasKit, canvas, requestFrame, dispose, logicalWidth, logicalHeight } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 12,
    backgroundColor: "#1c1917",
  });

  const scroll = new ScrollViewNode(yoga);
  scroll.setStyle({ width: "100%", height: "100%" });
  /** 测试页无完整 hover 管线时仍显示滚动条，便于看到 ScrollView 绘制。 */
  scroll.scrollbarHoverVisible = true;

  const content = new ViewNode(yoga, "View");
  content.setStyle({
    width: "100%",
    padding: 8,
    gap: 8,
    backgroundColor: "#292524",
  });

  const colors = ["#57534e", "#78716c", "#a8a29e", "#d6d3d1", "#e7e5e4"];
  for (let i = 0; i < 12; i++) {
    const row = new ViewNode(yoga, "View");
    row.setStyle({
      height: 44,
      backgroundColor: colors[i % colors.length]!,
      borderRadius: 6,
    });
    content.appendChild(row);
  }

  scroll.appendChild(content);
  root.appendChild(scroll);

  requestFrame(root);

  const onWheel = (ev: WheelEvent) => {
    if (ev.metaKey || ev.ctrlKey) return;
    const { x, y } = clientToCanvasLogical(
      ev.clientX,
      ev.clientY,
      canvas,
      logicalWidth,
      logicalHeight,
    );
    const hit = hitTest(root, x, y, canvasKit);
    const sv = findAncestorScrollView(hit);
    if (!sv) return;
    ev.preventDefault();
    sv.scrollY += ev.deltaY;
    sv.clampScrollOffsetsAfterLayout();
    requestFrame(root);
  };

  canvas.addEventListener("wheel", onWheel, { passive: false });

  return () => {
    canvas.removeEventListener("wheel", onWheel);
    root.destroy();
    dispose();
  };
}
