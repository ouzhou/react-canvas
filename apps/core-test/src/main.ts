import "./style.css";

import { mountAnimationDemo } from "./demos/demo-animation.ts";
import { mountAnimationDemoReact } from "./demos/demo-animation.react.ts";
import { mountArchitectureDemo } from "./demos/demo-architecture.ts";
import { mountArchitectureDemoReact } from "./demos/demo-architecture.react.tsx";
import { mountCursorDemo } from "./demos/demo-cursor.ts";
import { mountCursorDemoReact } from "./demos/demo-cursor.react.ts";
import { mountEventsDemo } from "./demos/demo-events.ts";
import { mountEventsDemoReact } from "./demos/demo-events.react.ts";
import { mountFrameSchedulerDemo } from "./demos/demo-frame-scheduler.ts";
import { mountFrameSchedulerDemoReact } from "./demos/demo-frame-scheduler.react.ts";
import { mountInteractionFocusDemo } from "./demos/demo-interaction-focus.ts";
import { mountInteractionFocusDemoReact } from "./demos/demo-interaction-focus.react.ts";
import { mountLayoutEngineDemo } from "./demos/demo-layout-engine.ts";
import { mountLayoutEngineDemoReact } from "./demos/demo-layout-engine.react.ts";
import { mountNodeModelDemo } from "./demos/demo-node-model.ts";
import { mountNodeModelDemoReact } from "./demos/demo-node-model.react.ts";
import { mountOverflowClipDemo } from "./demos/demo-overflow-clip.ts";
import { mountOverflowClipDemoReact } from "./demos/demo-overflow-clip.react.ts";
import { mountPackageBoundaryDemo } from "./demos/demo-package-boundary.ts";
import { mountPendingIssuesDemo } from "./demos/demo-pending-issues.ts";
import { mountPendingIssuesDemoReact } from "./demos/demo-pending-issues.react.ts";
import { mountPluginDemo } from "./demos/demo-plugin.ts";
import { mountPluginDemoReact } from "./demos/demo-plugin.react.ts";
import { mountRenderPipelineDemo } from "./demos/demo-opacity-zindex.ts";
import { mountRenderPipelineDemoReact } from "./demos/demo-opacity-zindex.react.ts";
import { mountRuntimeStatusDemo } from "./demos/demo-runtime-status.ts";
import { mountRuntimeStatusDemoReact } from "./demos/demo-runtime-status.react.ts";
import { mountScrollViewDemo } from "./demos/demo-scroll-view.ts";
import { mountScrollViewDemoReact } from "./demos/demo-scroll-view.react.ts";
import { mountStandaloneApiDemo } from "./demos/demo-standalone-api.ts";
import { mountStageDemo } from "./demos/demo-stage.ts";
import { mountStageDemoReact } from "./demos/demo-stage.react.ts";
import { mountStageLayersDemo } from "./demos/demo-stage-layers.ts";
import { mountStageLayersDemoReact } from "./demos/demo-stage-layers.react.ts";
import { mountNonReactDemoStub } from "./lib/non-react-demo-stub.ts";

/** 旧 URL `?demo=` 兼容（合并 demo 前的 id） */
const LEGACY_DEMO_PARAM: Record<string, DemoId> = {
  flex: "layout",
  text: "nodes",
  image: "nodes",
  svg: "nodes",
  camera: "stage",
  zindex: "render",
  pointer: "events",
};

type DemoId =
  | "architecture"
  | "runtime"
  | "stage"
  | "layers"
  | "nodes"
  | "layout"
  | "render"
  | "events"
  | "anim"
  | "frame"
  | "standalone"
  | "package"
  | "pending"
  | "focus"
  | "cursor"
  | "overflow"
  | "scroll"
  | "plugin";

/** 与 `docs/core-design.md`「目录」§1–§18 顺序一致（有可视化项的章节）。 */
const DEMOS: { id: DemoId; section: string; label: string; hint: string }[] = [
  {
    id: "architecture",
    section: "§1",
    label: "整体架构",
    hint: "分层：ui / react / core / yoga + CanvasKit",
  },
  {
    id: "runtime",
    section: "§2",
    label: "Runtime — 运行时初始化",
    hint: "initCanvasRuntime、getCanvasRuntimeInitSnapshot、WASM 单例",
  },
  {
    id: "stage",
    section: "§3",
    label: "Stage — 画布宿主",
    hint: "Surface、ViewportCamera、getNodeWorldRect",
  },
  {
    id: "layers",
    section: "§4",
    label: "Layer — 层系统",
    hint: "弹窗：modalLayer 遮罩 + 对话框；打开时底层不接收命中",
  },
  {
    id: "nodes",
    section: "§5",
    label: "节点模型",
    hint: "View / Text / Image / SvgPath 同屏",
  },
  {
    id: "layout",
    section: "§6",
    label: "布局引擎",
    hint: "Yoga：Flex、absolute、gap",
  },
  {
    id: "render",
    section: "§7",
    label: "渲染管线",
    hint: "paintNode、zIndex、opacity、多 Layer 绘制",
  },
  {
    id: "events",
    section: "§8",
    label: "事件系统",
    hint: "命中、冒泡、attachCanvasPointerHandlers",
  },
  { id: "anim", section: "§9", label: "动画", hint: "Ticker、createTicker" },
  {
    id: "frame",
    section: "§10",
    label: "帧调度器",
    hint: "requestLayoutPaint / requestPaintOnly、didLayout",
  },
  {
    id: "standalone",
    section: "§11",
    label: "独立使用 API（JS/TS）",
    hint: "无 React 初始化路径与代码对照",
  },
  {
    id: "package",
    section: "§12",
    label: "包边界",
    hint: "仅依赖 @react-canvas/core",
  },
  {
    id: "pending",
    section: "§13",
    label: "待决问题",
    hint: "设计文档 §13 条目摘录",
  },
  {
    id: "focus",
    section: "§14",
    label: "伪类模拟系统",
    hint: "interactionState、FocusManager",
  },
  {
    id: "cursor",
    section: "§15",
    label: "光标管理",
    hint: "CursorManager 优先级栈",
  },
  {
    id: "overflow",
    section: "§16",
    label: "Overflow 与 BorderRadius 实现",
    hint: "clipRRect、裁剪与命中",
  },
  {
    id: "scroll",
    section: "§17",
    label: "嵌套滚动",
    hint: "ScrollView 嵌套与滚轮链",
  },
  {
    id: "plugin",
    section: "§18",
    label: "插件系统",
    hint: "Stage.use、PluginContext、钩子",
  },
];

const DEMO_PARAM = "demo";
const IMPL_PARAM = "impl";

type ImplId = "ts" | "react";

function normalizeImplParam(raw: string | null): ImplId {
  return raw === "react" ? "react" : "ts";
}

function normalizeDemoParam(raw: string | null): DemoId | null {
  if (!raw) return null;
  const mapped = LEGACY_DEMO_PARAM[raw] ?? raw;
  return DEMOS.some((d) => d.id === mapped) ? (mapped as DemoId) : null;
}

function readDemoFromUrl(): DemoId | null {
  try {
    const q = new URLSearchParams(window.location.search).get(DEMO_PARAM);
    return normalizeDemoParam(q);
  } catch {
    return null;
  }
}

function readImplFromUrl(): ImplId {
  try {
    const q = new URLSearchParams(window.location.search).get(IMPL_PARAM);
    return normalizeImplParam(q);
  } catch {
    return "ts";
  }
}

function writeDemoAndImplToUrl(id: DemoId, impl: ImplId): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(DEMO_PARAM, id);
    url.searchParams.set(IMPL_PARAM, impl);
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* ignore */
  }
}

function main(): void {
  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;

  app.innerHTML = `
    <a class="skip-link" href="#main-content">跳到画布内容</a>
    <div class="shell">
      <header class="app-header">
        <h1>@react-canvas/core 可视化验收</h1>
        <p class="sub">
          按 <code>docs/core-design.md</code> 目录 §1–§18 逐项对照；说明见
          <code>apps/core-test/CORE_DESIGN_CHECK.md</code>。
        </p>
        <div class="impl-switch" role="group" aria-label="场景实现">
          <span class="impl-switch__label">实现</span>
          <button type="button" class="impl-switch__btn" id="impl-ts" data-impl="ts">原生 TS</button>
          <button type="button" class="impl-switch__btn" id="impl-react" data-impl="react">React</button>
        </div>
      </header>
      <div class="body">
        <aside class="sidebar" aria-label="Demo 列表">
          <nav class="demo-nav" id="demo-nav"></nav>
        </aside>
        <main id="main-content" class="main" tabindex="-1">
          <p class="hint" id="demo-hint"></p>
          <div class="status" id="demo-status" hidden aria-live="polite"></div>
          <div class="canvas-wrap" id="demo-canvas-wrap"></div>
        </main>
      </div>
    </div>
  `;

  const nav = app.querySelector<HTMLElement>("#demo-nav")!;
  const hintEl = app.querySelector<HTMLElement>("#demo-hint")!;
  const statusEl = app.querySelector<HTMLElement>("#demo-status")!;
  const wrap = app.querySelector<HTMLElement>("#demo-canvas-wrap")!;
  const mainEl = app.querySelector<HTMLElement>("#main-content")!;
  const implTsBtn = app.querySelector<HTMLButtonElement>("#impl-ts")!;
  const implReactBtn = app.querySelector<HTMLButtonElement>("#impl-react")!;

  const buttons = new Map<DemoId, HTMLButtonElement>();

  for (const d of DEMOS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "demo-nav-item";
    btn.dataset.demoId = d.id;
    btn.setAttribute("aria-label", `${d.section} ${d.label}：${d.hint}`);
    btn.innerHTML = `<span class="demo-nav-title-row"><span class="demo-nav-section">${d.section}</span><span class="demo-nav-label">${d.label}</span></span><span class="demo-nav-hint">${d.hint}</span>`;
    nav.appendChild(btn);
    buttons.set(d.id, btn);
  }

  let cleanup: (() => void) | null = null;
  let activeImpl: ImplId = readImplFromUrl();
  let active: DemoId = readDemoFromUrl() ?? "architecture";

  const setStatus = (msg: string): void => {
    statusEl.classList.remove("status--event-log");
    statusEl.hidden = msg.length === 0;
    statusEl.innerHTML = msg;
  };

  /** §8 events：追加一行，不覆盖（便于观察冒泡顺序）。 */
  const appendEventLog = (msg: string): void => {
    statusEl.hidden = false;
    statusEl.classList.add("status--event-log");
    const line = document.createElement("div");
    line.className = "status-log-line";
    const t = new Date();
    const stamp = `${t.toLocaleTimeString("zh-CN", { hour12: false })}.${String(t.getMilliseconds()).padStart(3, "0")}`;
    line.textContent = `[${stamp}] ${msg}`;
    statusEl.append(line);
    statusEl.scrollTop = statusEl.scrollHeight;
  };

  const syncNav = (id: DemoId): void => {
    for (const [bid, el] of buttons) {
      const pressed = bid === id;
      el.setAttribute("aria-pressed", pressed ? "true" : "false");
      if (pressed) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    }
  };

  const syncImplNav = (impl: ImplId): void => {
    implTsBtn.setAttribute("aria-pressed", impl === "ts" ? "true" : "false");
    implReactBtn.setAttribute("aria-pressed", impl === "react" ? "true" : "false");
  };

  const run = async (id: DemoId): Promise<void> => {
    cleanup?.();
    cleanup = null;
    wrap.replaceChildren();
    setStatus("");
    active = id;
    syncNav(id);
    syncImplNav(activeImpl);
    writeDemoAndImplToUrl(id, activeImpl);

    const meta = DEMOS.find((d) => d.id === id);
    hintEl.textContent = meta?.hint ?? "";

    const react = activeImpl === "react";
    const stub = react && (id === "standalone" || id === "package");

    if (stub) {
      cleanup = mountNonReactDemoStub(wrap);
      return;
    }

    if (react) {
      if (id === "architecture") {
        cleanup = await mountArchitectureDemoReact(wrap);
      } else if (id === "runtime") {
        cleanup = await mountRuntimeStatusDemoReact(wrap, (html) => setStatus(html));
      } else if (id === "stage") {
        cleanup = await mountStageDemoReact(wrap, (msg) => setStatus(msg));
      } else if (id === "layers") {
        cleanup = await mountStageLayersDemoReact(wrap, (msg) => setStatus(msg));
      } else if (id === "nodes") {
        cleanup = await mountNodeModelDemoReact(wrap, (msg) => setStatus(msg));
      } else if (id === "layout") {
        cleanup = await mountLayoutEngineDemoReact(wrap);
      } else if (id === "render") {
        cleanup = await mountRenderPipelineDemoReact(wrap, appendEventLog);
      } else if (id === "events") {
        cleanup = await mountEventsDemoReact(wrap, appendEventLog);
      } else if (id === "anim") {
        cleanup = await mountAnimationDemoReact(wrap, (msg) => setStatus(msg));
      } else if (id === "frame") {
        cleanup = await mountFrameSchedulerDemoReact(wrap, (msg) => setStatus(msg));
      } else if (id === "pending") {
        cleanup = await mountPendingIssuesDemoReact(wrap);
      } else if (id === "focus") {
        cleanup = await mountInteractionFocusDemoReact(wrap, (msg) => setStatus(msg));
      } else if (id === "cursor") {
        cleanup = await mountCursorDemoReact(wrap, (msg) => setStatus(msg));
      } else if (id === "overflow") {
        cleanup = await mountOverflowClipDemoReact(wrap);
      } else if (id === "scroll") {
        cleanup = await mountScrollViewDemoReact(wrap);
      } else {
        cleanup = await mountPluginDemoReact(wrap, (msg) => setStatus(msg));
      }
      return;
    }

    if (id === "architecture") {
      cleanup = await mountArchitectureDemo(wrap);
    } else if (id === "runtime") {
      cleanup = await mountRuntimeStatusDemo(wrap, (html) => setStatus(html));
    } else if (id === "stage") {
      cleanup = await mountStageDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "layers") {
      cleanup = await mountStageLayersDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "nodes") {
      cleanup = await mountNodeModelDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "layout") {
      cleanup = await mountLayoutEngineDemo(wrap);
    } else if (id === "render") {
      cleanup = await mountRenderPipelineDemo(wrap, appendEventLog);
    } else if (id === "events") {
      cleanup = await mountEventsDemo(wrap, appendEventLog);
    } else if (id === "anim") {
      cleanup = await mountAnimationDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "frame") {
      cleanup = await mountFrameSchedulerDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "standalone") {
      cleanup = await mountStandaloneApiDemo(wrap);
    } else if (id === "package") {
      cleanup = await mountPackageBoundaryDemo(wrap);
    } else if (id === "pending") {
      cleanup = await mountPendingIssuesDemo(wrap);
    } else if (id === "focus") {
      cleanup = await mountInteractionFocusDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "cursor") {
      cleanup = await mountCursorDemo(wrap, (msg) => setStatus(msg));
    } else if (id === "overflow") {
      cleanup = await mountOverflowClipDemo(wrap);
    } else if (id === "scroll") {
      cleanup = await mountScrollViewDemo(wrap);
    } else {
      cleanup = await mountPluginDemo(wrap, (msg) => setStatus(msg));
    }
  };

  nav.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLButtonElement>(".demo-nav-item");
    if (!t?.dataset.demoId) return;
    const id = t.dataset.demoId as DemoId;
    void run(id);
  });

  const implRow = app.querySelector<HTMLElement>(".impl-switch")!;
  implRow.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLButtonElement>("[data-impl]");
    if (!t?.dataset.impl) return;
    const next = normalizeImplParam(t.dataset.impl);
    if (next === activeImpl) return;
    activeImpl = next;
    void run(active);
  });

  void run(active);

  mainEl.addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowDown" && ev.key !== "ArrowUp") return;
    ev.preventDefault();
    const idx = DEMOS.findIndex((d) => d.id === active);
    if (idx < 0) return;
    const next =
      ev.key === "ArrowDown"
        ? DEMOS[Math.min(DEMOS.length - 1, idx + 1)]!
        : DEMOS[Math.max(0, idx - 1)]!;
    buttons.get(next.id)?.focus();
    void run(next.id);
  });
}

main();
