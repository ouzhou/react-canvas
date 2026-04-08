import "./style.css";

import { mountFlexLayoutDemo } from "./demos/demo-flex-layout.ts";
import { mountPointerHitDemo } from "./demos/demo-pointer-hit.ts";
import { mountScrollViewDemo } from "./demos/demo-scroll-view.ts";
import { mountTextDemo } from "./demos/demo-text.ts";

type DemoId = "flex" | "text" | "pointer" | "scroll";

const DEMOS: { id: DemoId; label: string; hint: string }[] = [
  { id: "flex", label: "Flex 布局", hint: "ViewNode + Yoga：行方向、gap、圆角色块" },
  { id: "text", label: "文字", hint: "TextNode + 默认段落字体" },
  { id: "pointer", label: "点击命中", hint: "hitTest、冒泡、合成 click" },
  { id: "scroll", label: "ScrollView", hint: "滚轮滚动（条为调试强制显示）" },
];

function main(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;

  app.innerHTML = `
    <div class="page">
      <header class="header">
        <h1>@react-canvas/core 本地试跑</h1>
        <p class="sub">纯 core API：ViewNode / TextNode / ScrollViewNode、布局、绘制与指针管线（无 React 层）。</p>
      </header>
      <nav class="tabs" role="tablist" aria-label="Demo 切换"></nav>
      <p class="hint" id="demo-hint"></p>
      <p class="status" id="demo-status" hidden></p>
      <div class="canvas-wrap" id="demo-canvas-wrap"></div>
    </div>
  `;

  const tabs = app.querySelector<HTMLElement>(".tabs")!;
  const hintEl = app.querySelector<HTMLElement>("#demo-hint")!;
  const statusEl = app.querySelector<HTMLElement>("#demo-status")!;
  const wrap = app.querySelector<HTMLElement>("#demo-canvas-wrap")!;

  let cleanup: (() => void) | null = null;
  let active: DemoId = "flex";

  const setStatus = (msg: string): void => {
    statusEl.hidden = msg.length === 0;
    statusEl.textContent = msg;
  };

  const run = async (id: DemoId): Promise<void> => {
    cleanup?.();
    cleanup = null;
    wrap.replaceChildren();
    setStatus("");

    const meta = DEMOS.find((d) => d.id === id);
    hintEl.textContent = meta?.hint ?? "";

    if (id === "flex") {
      cleanup = await mountFlexLayoutDemo(wrap);
    } else if (id === "text") {
      cleanup = await mountTextDemo(wrap);
    } else if (id === "pointer") {
      cleanup = await mountPointerHitDemo(wrap, (msg) => setStatus(msg));
    } else {
      cleanup = await mountScrollViewDemo(wrap);
    }
  };

  for (const d of DEMOS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tab";
    b.textContent = d.label;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", d.id === active ? "true" : "false");
    b.addEventListener("click", () => {
      active = d.id;
      for (const x of tabs.querySelectorAll(".tab")) {
        x.setAttribute("aria-selected", x === b ? "true" : "false");
      }
      void run(active);
    });
    tabs.appendChild(b);
  }

  void run(active);
}

main();
