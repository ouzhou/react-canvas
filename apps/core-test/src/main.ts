import "./style.css";

import { mountAnimationDemo } from "./demos/demo-animation.ts";
import { mountFlexLayoutDemo } from "./demos/demo-flex-layout.ts";
import { mountImageDemo } from "./demos/demo-image.ts";
import { mountOpacityZIndexDemo } from "./demos/demo-opacity-zindex.ts";
import { mountPointerHitDemo } from "./demos/demo-pointer-hit.ts";
import { mountRuntimeStatusDemo } from "./demos/demo-runtime-status.ts";
import { mountScrollViewDemo } from "./demos/demo-scroll-view.ts";
import { mountStageLayersDemo } from "./demos/demo-stage-layers.ts";
import { mountSvgPathDemo } from "./demos/demo-svg-path.ts";
import { mountTextDemo } from "./demos/demo-text.ts";
import { mountViewportCameraDemo } from "./demos/demo-viewport-camera.ts";

type DemoId =
  | "runtime"
  | "layers"
  | "flex"
  | "text"
  | "image"
  | "svg"
  | "zindex"
  | "camera"
  | "anim"
  | "pointer"
  | "scroll";

const DEMOS: { id: DemoId; label: string; hint: string }[] = [
  {
    id: "runtime",
    label: "Runtime 快照",
    hint: "getRuntimeSnapshot + initRuntime（见 createStageDemoHost）",
  },
  { id: "layers", label: "多 Layer", hint: "default / overlay / modal 三色块叠加" },
  { id: "flex", label: "Flex 布局", hint: "ViewNode 行方向、gap、圆角" },
  { id: "text", label: "文字", hint: "TextNode + 默认段落字体" },
  { id: "image", label: "图片", hint: "ImageNode + registerPaintFrameRequester 重绘" },
  { id: "svg", label: "SVG Path", hint: "SvgPathNode 矢量" },
  { id: "zindex", label: "zIndex / opacity", hint: "层叠与透明度" },
  { id: "camera", label: "视口相机", hint: "ViewportCamera + 命中与绘制一致" },
  { id: "anim", label: "动画", hint: "Ticker + updateStyle + requestPaintOnly" },
  { id: "pointer", label: "指针管线", hint: "attachCanvasPointerHandlers 全量" },
  { id: "scroll", label: "ScrollView", hint: "Stage.attachPointerHandlers + 滚轮" },
];

function main(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;

  app.innerHTML = `
    <div class="page">
      <header class="header">
        <h1>@react-canvas/core 可视化验收</h1>
        <p class="sub">纯 core + <code>Stage</code> / <code>initRuntime</code>，与 <code>docs/core-design.md</code> 对齐；对照表见仓库 <code>apps/core-test/CORE_DESIGN_CHECK.md</code>。</p>
      </header>
      <div class="pick-row">
        <label class="pick-label" for="demo-select">选择 Demo</label>
        <select id="demo-select" class="demo-select" aria-label="选择 Demo"></select>
      </div>
      <p class="hint" id="demo-hint"></p>
      <p class="status" id="demo-status" hidden></p>
      <div class="canvas-wrap" id="demo-canvas-wrap"></div>
    </div>
  `;

  const select = app.querySelector<HTMLSelectElement>("#demo-select")!;
  const hintEl = app.querySelector<HTMLElement>("#demo-hint")!;
  const statusEl = app.querySelector<HTMLElement>("#demo-status")!;
  const wrap = app.querySelector<HTMLElement>("#demo-canvas-wrap")!;

  for (const d of DEMOS) {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = `${d.label} — ${d.hint}`;
    select.appendChild(opt);
  }

  let cleanup: (() => void) | null = null;
  let active: DemoId = "flex";

  const setStatus = (msg: string): void => {
    statusEl.hidden = msg.length === 0;
    statusEl.innerHTML = msg;
  };

  const run = async (id: DemoId): Promise<void> => {
    cleanup?.();
    cleanup = null;
    wrap.replaceChildren();
    setStatus("");

    const meta = DEMOS.find((d) => d.id === id);
    hintEl.textContent = meta?.hint ?? "";

    if (id === "runtime") {
      cleanup = await mountRuntimeStatusDemo(wrap, (html) => setStatus(html));
    } else if (id === "layers") {
      cleanup = await mountStageLayersDemo(wrap);
    } else if (id === "flex") {
      cleanup = await mountFlexLayoutDemo(wrap);
    } else if (id === "text") {
      cleanup = await mountTextDemo(wrap);
    } else if (id === "image") {
      cleanup = await mountImageDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "svg") {
      cleanup = await mountSvgPathDemo(wrap);
    } else if (id === "zindex") {
      cleanup = await mountOpacityZIndexDemo(wrap);
    } else if (id === "camera") {
      cleanup = await mountViewportCameraDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "anim") {
      cleanup = await mountAnimationDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "pointer") {
      cleanup = await mountPointerHitDemo(wrap, (msg) => setStatus(msg));
    } else {
      cleanup = await mountScrollViewDemo(wrap);
    }
  };

  select.addEventListener("change", () => {
    active = select.value as DemoId;
    void run(active);
  });

  select.value = active;
  void run(active);
}

main();
