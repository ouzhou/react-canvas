import type { Plugin, ViewStyle } from "@react-canvas/core";
import { ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

/**
 * `requestLayoutPaint` vs `requestPaintOnly` + `BeforePaintEvent.didLayout`，与 `core-design.md` §10 对齐。
 */
export async function mountFrameSchedulerDemo(
  container: HTMLElement,
  onStatus: (msg: string) => void,
): Promise<() => void> {
  const host = await createStageDemoHost(container, 360, 140);
  const { runtime, stage, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  let layoutFrames = 0;
  let paintOnlyFrames = 0;
  let untapAfterPaint: (() => void) | undefined;

  const counterPlugin: Plugin = {
    name: "core-test-frame-scheduler-counter",
    attach(ctx) {
      untapAfterPaint = ctx.onAfterPaint.tap((e) => {
        if (e.didLayout) layoutFrames++;
        else paintOnlyFrames++;
        onStatus(
          `afterPaint：含 Yoga 布局 ${layoutFrames} 次 · 仅重绘 ${paintOnlyFrames} 次（didLayout=${String(e.didLayout)}）`,
        );
      });
    },
    detach() {
      untapAfterPaint?.();
    },
  };

  stage.use(counterPlugin);

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    padding: 16,
    backgroundColor: "#0c0a09",
    justifyContent: "center",
    alignItems: "center",
  });

  const box = new ViewNode(yoga, "View");
  const base: ViewStyle = {
    width: 140,
    height: 72,
    backgroundColor: "#334155",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  };
  box.setStyle(base);
  let prevStyle: ViewStyle = { ...base };

  root.appendChild(box);
  sceneRoot.appendChild(root);
  requestFrame();
  onStatus("§10 帧调度器 — 点击按钮，观察 onAfterPaint 中 didLayout 与计数。");

  const tools = document.createElement("div");
  tools.className = "camera-tools";
  tools.innerHTML = `
    <button type="button" data-a="layout">切换宽度（走 layout + 绘制）</button>
    <button type="button" data-a="paint">切换背景色（仅 requestPaintOnly）</button>
  `;
  container.insertBefore(tools, container.firstChild);

  tools.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest("button");
    if (!t) return;
    const a = t.getAttribute("data-a");
    if (a === "layout") {
      const w = prevStyle.width === 140 ? 220 : 140;
      const next: ViewStyle = { ...prevStyle, width: w };
      box.updateStyle(prevStyle, next);
      prevStyle = next;
      stage.requestLayoutPaint();
    } else if (a === "paint") {
      const bg = prevStyle.backgroundColor === "#334155" ? "#0d9488" : "#334155";
      const next: ViewStyle = { ...prevStyle, backgroundColor: bg };
      box.updateStyle(prevStyle, next);
      prevStyle = next;
      stage.requestPaintOnly();
    }
  });

  return () => {
    tools.remove();
    root.destroy();
    dispose();
  };
}
