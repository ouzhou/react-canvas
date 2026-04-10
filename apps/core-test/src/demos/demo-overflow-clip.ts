import { TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * `overflow` + `borderRadius` 子内容裁剪，与 `core-design.md` §16 对齐。
 */
export async function mountOverflowClipDemo(container: HTMLElement): Promise<() => void> {
  const host = await createStageDemoHost(container, 380, 200);
  const { runtime, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 12,
    gap: 12,
    flexDirection: "column",
    backgroundColor: "#0f172a",
  });

  const caption = new TextNode(yoga);
  caption.setStyle({ fontSize: 11, color: "#94a3b8" });
  caption.appendTextSlot({
    nodeValue:
      "§16 Overflow 与 BorderRadius 实现 — 左：visible 子可绘出盒外；右：hidden + 圆角 clip 子内容",
  });

  const row = new ViewNode(yoga, "View");
  row.setStyle({
    flexDirection: "row",
    gap: 14,
    flex: 1,
    alignItems: "stretch",
  });

  const mk = (opts: { clip: boolean; title: string }) => {
    const col = new ViewNode(yoga, "View");
    col.setStyle({ flex: 1, flexDirection: "column", gap: 6, minWidth: 0 });

    const title = new TextNode(yoga);
    title.setStyle({ fontSize: 11, color: "#cbd5e1" });
    title.appendTextSlot({ nodeValue: opts.title });

    const outer = new ViewNode(yoga, "View");
    outer.setStyle({
      width: "100%",
      height: 112,
      backgroundColor: "#1e293b",
      borderRadius: opts.clip ? 22 : 6,
      overflow: opts.clip ? "hidden" : "visible",
    });

    const inner = new ViewNode(yoga, "View");
    inner.setStyle({
      position: "absolute",
      left: 24,
      top: 28,
      width: 160,
      height: 96,
      backgroundColor: "#ea580c",
      opacity: 0.95,
    });

    outer.appendChild(inner);
    col.appendChild(title);
    col.appendChild(outer);
    return col;
  };

  row.appendChild(
    mk({
      clip: false,
      title: "overflow 默认 / visible",
    }),
  );
  row.appendChild(
    mk({
      clip: true,
      title: "overflow:hidden + borderRadius",
    }),
  );

  root.appendChild(caption);
  root.appendChild(row);
  sceneRoot.appendChild(root);
  requestFrame();

  return () => {
    root.destroy();
    dispose();
  };
}
