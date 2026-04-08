import { TextNode, ViewNode } from "@react-canvas/core";

import { createDemoHost } from "../lib/demo-host.ts";

export async function mountTextDemo(container: HTMLElement): Promise<() => void> {
  const host = await createDemoHost(container, 360, 120);
  const { runtime, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 16,
    backgroundColor: "#1e293b",
    justifyContent: "center",
  });

  const text = new TextNode(yoga);
  text.setStyle({
    fontSize: 18,
    color: "#e2e8f0",
    lineHeight: 1.4,
  });
  text.appendTextSlot({ nodeValue: "Core · TextNode + Skia Paragraph：中文与 English 混排。" });

  root.appendChild(text);
  requestFrame(root);

  return () => {
    root.destroy();
    dispose();
  };
}
