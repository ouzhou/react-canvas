import type { CanvasSyntheticPointerEvent } from "@react-canvas/core";
import { TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * `docs/core-design.md` §4 Layer — 弹窗系统：default 主界面、overlay 提示条、modal 遮罩 + 对话框（modalLayer.captureEvents）。
 */
export async function mountStageLayersDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const host = await createStageDemoHost(container, 400, 280);
  const { runtime, stage, dispose } = host;
  const { yoga } = runtime;

  const paint = (): void => {
    stage.requestLayoutPaint();
  };

  const closeModal = (): void => {
    const mr = stage.modalLayer.root;
    const copy = [...mr.children];
    for (const c of copy) {
      mr.removeChild(c);
      c.destroy();
    }
    stage.modalLayer.visible = false;
    onStatus("modalLayer.visible = false · 事件回到 defaultLayer");
    paint();
  };

  const openModal = (): void => {
    const mr = stage.modalLayer.root;
    const copy = [...mr.children];
    for (const c of copy) {
      mr.removeChild(c);
      c.destroy();
    }
    stage.modalLayer.visible = true;

    const backdrop = new ViewNode(yoga, "View");
    backdrop.setStyle({
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(15,23,42,0.72)",
      justifyContent: "center",
      alignItems: "center",
    });
    backdrop.interactionHandlers = {
      onClick: () => {
        closeModal();
      },
    };

    const panel = new ViewNode(yoga, "View");
    panel.setStyle({
      padding: 20,
      backgroundColor: "#f8fafc",
      borderRadius: 14,
      minWidth: 220,
      maxWidth: 280,
      gap: 12,
    });
    panel.interactionHandlers = {
      onClick: (e: CanvasSyntheticPointerEvent) => {
        e.stopPropagation();
      },
    };

    const title = new TextNode(yoga);
    title.setStyle({ fontSize: 16, fontWeight: "bold", color: "#0f172a" });
    title.appendTextSlot({ nodeValue: "Modal · modalLayer（z=1000）" });

    const body = new TextNode(yoga);
    body.setStyle({ fontSize: 12, color: "#475569", lineHeight: 1.4 });
    body.appendTextSlot({
      nodeValue: "遮罩点击关闭；面板内点击不穿透（stopPropagation）。底层按钮此时不可点。",
    });

    const row = new ViewNode(yoga, "View");
    row.setStyle({ flexDirection: "row", justifyContent: "flex-end" });
    const closeBtn = new ViewNode(yoga, "View");
    closeBtn.setStyle({
      padding: 8,
      paddingLeft: 14,
      paddingRight: 14,
      backgroundColor: "#2563eb",
      borderRadius: 8,
      cursor: "pointer",
    });
    const closeTx = new TextNode(yoga);
    closeTx.setStyle({ fontSize: 13, color: "#ffffff" });
    closeTx.appendTextSlot({ nodeValue: "关闭" });
    closeBtn.appendChild(closeTx);
    closeBtn.interactionHandlers = {
      onClick: (e: CanvasSyntheticPointerEvent) => {
        e.stopPropagation();
        closeModal();
      },
    };
    row.appendChild(closeBtn);

    panel.appendChild(title);
    panel.appendChild(body);
    panel.appendChild(row);
    backdrop.appendChild(panel);
    mr.appendChild(backdrop);
    onStatus("modalLayer.visible = true · 命中自顶向下优先 modal");
    paint();
  };

  const defaultRoot = stage.defaultLayer.root;
  const main = new ViewNode(yoga, "View");
  main.setStyle({
    width: "100%",
    height: "100%",
    padding: 16,
    gap: 12,
    flexDirection: "column",
    backgroundColor: "#ecfdf5",
  });

  const cap = new TextNode(yoga);
  cap.setStyle({ fontSize: 11, color: "#166534" });
  cap.appendTextSlot({
    nodeValue: "§4 defaultLayer — 主界面；打开弹窗后验证底层不可点",
  });

  const openBtn = new ViewNode(yoga, "View");
  openBtn.setStyle({
    alignSelf: "flex-start",
    padding: 10,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: "#059669",
    borderRadius: 10,
    cursor: "pointer",
  });
  const openTx = new TextNode(yoga);
  openTx.setStyle({ fontSize: 14, color: "#ffffff" });
  openTx.appendTextSlot({ nodeValue: "打开弹窗（挂到 modalLayer）" });
  openBtn.appendChild(openTx);
  openBtn.interactionHandlers = {
    onClick: () => {
      openModal();
    },
  };

  const probe = new ViewNode(yoga, "View");
  probe.setStyle({
    alignSelf: "flex-start",
    padding: 10,
    backgroundColor: "#86efac",
    borderRadius: 8,
    cursor: "pointer",
  });
  const probeTx = new TextNode(yoga);
  probeTx.setStyle({ fontSize: 12, color: "#14532d" });
  probeTx.appendTextSlot({ nodeValue: "探测：弹窗打开时点我应无反应" });
  probe.appendChild(probeTx);
  probe.interactionHandlers = {
    onClick: () => {
      onStatus("底层仍收到点击（异常）");
    },
  };

  main.appendChild(cap);
  main.appendChild(openBtn);
  main.appendChild(probe);
  defaultRoot.appendChild(main);

  const ov = new ViewNode(yoga, "View");
  ov.setStyle({
    margin: 10,
    padding: 8,
    alignSelf: "center",
    backgroundColor: "#fef08a",
    borderRadius: 8,
  });
  const ovTx = new TextNode(yoga);
  ovTx.setStyle({ fontSize: 12, color: "#713f12" });
  ovTx.appendTextSlot({ nodeValue: "§4 overlayLayer（z=100）· 下拉提示 / Tooltip 心智" });
  ov.appendChild(ovTx);
  stage.overlayLayer.root.appendChild(ov);

  stage.modalLayer.visible = false;

  paint();

  const detach = stage.attachPointerHandlers();

  return () => {
    detach();
    dispose();
  };
}
