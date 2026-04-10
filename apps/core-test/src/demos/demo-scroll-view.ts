import { ScrollViewNode, TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * `docs/core-design.md` §17 嵌套滚动 — 外层 ScrollView + 内层 ScrollView + 滚轮链；底部单独横向 ScrollView 示例。
 */
export async function mountScrollViewDemo(container: HTMLElement): Promise<() => void> {
  const host = await createStageDemoHost(container, 400, 400);
  const { runtime, stage, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 10,
    gap: 6,
    flexDirection: "column",
    backgroundColor: "#1c1917",
  });

  const cap = new TextNode(yoga);
  cap.setStyle({ fontSize: 11, color: "#a8a29e" });
  cap.appendTextSlot({
    nodeValue: "§17 嵌套滚动 — 内外 ScrollView；到底后继续滚轮交给外层（scroll chaining）",
  });

  const outer = new ScrollViewNode(yoga);
  outer.setStyle({ width: "100%", flex: 1, minHeight: 0 });
  outer.scrollbarHoverVisible = true;

  const outerContent = new ViewNode(yoga, "View");
  outerContent.setStyle({
    width: "100%",
    padding: 8,
    gap: 8,
    backgroundColor: "#292524",
  });

  const spacer = new ViewNode(yoga, "View");
  spacer.setStyle({ height: 36, backgroundColor: "#44403c", borderRadius: 6 });
  const spacerLabel = new TextNode(yoga);
  spacerLabel.setStyle({ fontSize: 11, color: "#d6d3d1", margin: 8 });
  spacerLabel.appendTextSlot({ nodeValue: "外层项 1（继续向下见内层滚动区）" });
  spacer.appendChild(spacerLabel);

  const inner = new ScrollViewNode(yoga);
  inner.setStyle({ width: "100%", height: 140 });
  inner.scrollbarHoverVisible = true;

  const innerContent = new ViewNode(yoga, "View");
  innerContent.setStyle({ width: "100%", padding: 6, gap: 6, backgroundColor: "#1c1917" });

  const innerColors = ["#57534e", "#78716c", "#a8a29e"];
  for (let i = 0; i < 8; i++) {
    const row = new ViewNode(yoga, "View");
    row.setStyle({
      height: 36,
      backgroundColor: innerColors[i % innerColors.length]!,
      borderRadius: 4,
    });
    innerContent.appendChild(row);
  }

  inner.appendChild(innerContent);

  const spacer2 = new ViewNode(yoga, "View");
  spacer2.setStyle({ height: 36, backgroundColor: "#44403c", borderRadius: 6 });
  const spacer2Label = new TextNode(yoga);
  spacer2Label.setStyle({ fontSize: 11, color: "#d6d3d1", margin: 8 });
  spacer2Label.appendTextSlot({ nodeValue: "外层项 2（内层滚到底后再滚轮会滚外层）" });
  spacer2.appendChild(spacer2Label);

  outerContent.appendChild(spacer);
  outerContent.appendChild(inner);
  outerContent.appendChild(spacer2);

  for (let j = 0; j < 6; j++) {
    const tail = new ViewNode(yoga, "View");
    tail.setStyle({ height: 32, backgroundColor: "#57534e", borderRadius: 4 });
    outerContent.appendChild(tail);
  }

  outer.appendChild(outerContent);

  const hCap = new TextNode(yoga);
  hCap.setStyle({ fontSize: 11, color: "#a8a29e" });
  hCap.appendTextSlot({
    nodeValue:
      "横向 ScrollView（horizontal=true）：下方为一行色块，总宽大于视口；请用触控板左右滑（deltaX）或 Shift+纵滚（依浏览器）试横向滚动。",
  });

  const hScroll = new ScrollViewNode(yoga);
  hScroll.horizontal = true;
  hScroll.setStyle({
    width: "100%",
    height: 96,
    backgroundColor: "#292524",
    borderRadius: 8,
  });
  hScroll.scrollbarHoverVisible = true;

  const hRow = new ViewNode(yoga, "View");
  hRow.setStyle({
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 8,
  });

  const hPalette = ["#57534e", "#78716c", "#a8a29e", "#d6d3d1"];
  for (let i = 0; i < 16; i++) {
    const card = new ViewNode(yoga, "View");
    card.setStyle({
      width: 64,
      height: 64,
      backgroundColor: hPalette[i % hPalette.length]!,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    });
    const label = new TextNode(yoga);
    label.setStyle({ fontSize: 12, color: "#fafaf9" });
    label.appendTextSlot({ nodeValue: `${i + 1}` });
    card.appendChild(label);
    hRow.appendChild(card);
  }

  hScroll.appendChild(hRow);

  root.appendChild(cap);
  root.appendChild(outer);
  root.appendChild(hCap);
  root.appendChild(hScroll);
  sceneRoot.appendChild(root);

  requestFrame();

  const detach = stage.attachPointerHandlers(sceneRoot);

  return () => {
    detach();
    root.destroy();
    dispose();
  };
}
