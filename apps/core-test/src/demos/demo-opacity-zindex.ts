import { type CanvasSyntheticPointerEvent, TextNode, ViewNode } from "@react-canvas/core";

import { createStageDemoHost } from "../lib/stage-demo-host.ts";

function mountZIndexToolbar(
  parent: HTMLElement,
  state: { zA: number; zB: number },
  onApply: () => void,
): () => void {
  const bar = document.createElement("div");
  bar.style.cssText =
    "display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:10px 12px;margin-bottom:8px;" +
    "background:#27272a;border:1px solid #3f3f46;border-radius:10px;font-size:12px;color:#d4d4d8;";

  const mk = (label: string, key: "zA" | "zB", min: number, max: number): void => {
    const wrap = document.createElement("label");
    wrap.style.cssText = "display:inline-flex;align-items:center;gap:6px;cursor:pointer;";
    const t = document.createElement("span");
    t.textContent = label;
    const range = document.createElement("input");
    range.type = "range";
    range.min = String(min);
    range.max = String(max);
    range.step = "1";
    range.value = String(state[key]);
    const valueEl = document.createElement("span");
    valueEl.style.minWidth = "20px";
    valueEl.style.fontVariantNumeric = "tabular-nums";
    valueEl.textContent = String(state[key]);
    range.addEventListener("input", () => {
      state[key] = Number(range.value);
      valueEl.textContent = String(state[key]);
      onApply();
    });
    wrap.appendChild(t);
    wrap.appendChild(range);
    wrap.appendChild(valueEl);
    bar.appendChild(wrap);
  };

  mk("红块 zIndex", "zA", 0, 8);
  mk("蓝块 zIndex", "zB", 0, 8);

  parent.insertBefore(bar, parent.firstChild);
  return () => bar.remove();
}

/** `docs/core-design.md` §7 渲染管线 — paintNode、zIndex、opacity（saveLayer）；可调 zIndex + 点击日志观察命中与冒泡。 */
export async function mountRenderPipelineDemo(
  container: HTMLElement,
  appendLog?: (msg: string) => void,
): Promise<() => void> {
  const log = (msg: string): void => {
    appendLog?.(msg);
  };

  const zState = { zA: 1, zB: 2 };

  const host = await createStageDemoHost(container, 400, 260);
  const { runtime, stage, sceneRoot, requestFrame, dispose } = host;
  const { yoga } = runtime;

  const root = new ViewNode(yoga, "View");
  root.setStyle({
    width: "100%",
    height: "100%",
    backgroundColor: "#18181b",
    position: "relative",
    flexDirection: "column",
    padding: 10,
    gap: 8,
  });

  const cap = new TextNode(yoga);
  cap.setStyle({ fontSize: 11, color: "#a1a1aa" });
  cap.appendTextSlot({
    nodeValue:
      "§7 渲染管线 — 滑块改 zIndex（命中/绘制均按 zIndex）；点击重叠区看日志：先 target 叶节点再沿父链冒泡",
  });

  const stageBox = new ViewNode(yoga, "View");
  stageBox.setStyle({
    flex: 1,
    minHeight: 0,
    position: "relative",
  });

  const a = new ViewNode(yoga, "View");
  const b = new ViewNode(yoga, "View");

  const applyZ = (): void => {
    a.setStyle({
      position: "absolute",
      left: 40,
      top: 40,
      width: 160,
      height: 120,
      backgroundColor: "#ef4444",
      borderRadius: 12,
      zIndex: zState.zA,
      opacity: 0.85,
    });
    b.setStyle({
      position: "absolute",
      left: 100,
      top: 70,
      width: 160,
      height: 120,
      backgroundColor: "#3b82f6",
      borderRadius: 12,
      zIndex: zState.zB,
    });
  };
  applyZ();

  const removeToolbar = mountZIndexToolbar(container, zState, () => {
    applyZ();
    requestFrame();
  });

  const t = new TextNode(yoga);
  t.setStyle({ fontSize: 12, color: "#f8fafc", margin: 8 });
  t.appendTextSlot({
    nodeValue: "蓝 zIndex=2 叠在红上；点文字或色块可看冒泡；红 opacity=0.85 走 saveLayer",
  });
  b.appendChild(t);

  const bubbleLog = (label: string) => (_e: CanvasSyntheticPointerEvent) => {
    log(`${label} · z(红,蓝)=${zState.zA},${zState.zB}`);
  };

  t.interactionHandlers = {
    onClick: bubbleLog("click ① target·蓝内文字"),
  };
  b.interactionHandlers = {
    onClick: bubbleLog("click ② 冒泡·蓝 View"),
  };
  a.interactionHandlers = {
    onClick: bubbleLog("click ② target·红 View"),
  };
  stageBox.interactionHandlers = {
    onClick: bubbleLog("click ③ 冒泡·重叠区父 stage"),
  };
  root.interactionHandlers = {
    onClick: bubbleLog("click ④ 冒泡·root"),
  };

  stageBox.appendChild(a);
  stageBox.appendChild(b);
  root.appendChild(cap);
  root.appendChild(stageBox);
  sceneRoot.appendChild(root);

  requestFrame();

  const detach = stage.attachPointerHandlers(sceneRoot);

  return () => {
    detach();
    removeToolbar();
    root.destroy();
    dispose();
  };
}
