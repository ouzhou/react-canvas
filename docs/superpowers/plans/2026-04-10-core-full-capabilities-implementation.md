# Core 全量能力（M1–M7）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 [`docs/superpowers/specs/2026-04-10-core-full-capabilities-roadmap-design.md`](../specs/2026-04-10-core-full-capabilities-roadmap-design.md) 在 `@react-canvas/core` 中顺序交付 M1–M7；每里程碑 **`vp test`（针对 `packages/core`）全绿**，并更新 [`apps/core-test/CORE_DESIGN_CHECK.md`](../../../apps/core-test/CORE_DESIGN_CHECK.md)。

**Architecture:** 基础设施优先：Stage 显式持有 `FrameScheduler`、图片重绘与 Stage 绑定、再 `Ticker`、指针捕获、`InteractionState`/`FocusManager`、`CursorManager`、滚动链与 `horizontal`、最后 `PluginContext`/`Stage.use()`。细节以 [`docs/core-design.md`](../../core-design.md) 为准。

**Tech Stack:** TypeScript、Vite+（`vp test` / `vp check`）、CanvasKit WASM、Yoga WASM、Vitest（`vite-plus/test`）。

**与既有计划的关系：** 本计划 **承接** [`2026-04-10-core-refactor-implementation.md`](./2026-04-10-core-refactor-implementation.md) 中已完成或可并行的 **Runtime / Stage / 多 Layer** 工作；若该文件中 Phase 1–3 尚未合并，优先完成其 **Stage + Surface + `requestLayoutPaint`** 路径，再进入本文 **M1**（避免双轨调度）。

---

## 文件与职责总览（跨里程碑）

| 路径                                                        | 职责                                                                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/runtime/frame-scheduler.ts`              | 已有：单 Surface 的 rAF 合并与 tick；M1 由 Stage **强引用**持有同一实例。                                                                                                             |
| `packages/core/src/runtime/frame-queue.ts`                  | M1：保留对 **无 Stage 的测试/旧调用** 的 `queue*` 导出，或改为委托 `FrameScheduler`；与 `Stage` 构造函数注册的 scheduler **必须**为同实例。                                           |
| `packages/core/src/stage/stage.ts`                          | M1：`readonly frameScheduler`（或等价 getter）、`destroy` 调用 `reset()`；M2：`createTicker()`；M3：指针捕获 Map；M4：`focusManager`；M5：`cursorManager`；M7：`plugins` 与 `use()`。 |
| `packages/core/src/stage/stage-link.ts`（新建，名称可微调） | M1：`getStageFromViewNode(node)`：沿 `parent` 链找到 `Layer.root` 上挂载的 Stage 引用（避免 `ImageNode` 全局广播）。                                                                  |
| `packages/core/src/stage/layer.ts`                          | M1：在构造函数中把 `stage` 关联到 `this.root`（供 `stage-link` 查找）。                                                                                                               |
| `packages/core/src/render/paint-frame-requester.ts`         | M1：**缩小**全局 `requestRedrawFromImage` 使用面；宿主仅测试或迁移期保留；生产路径以 `ImageNode` → `Stage.requestPaintOnly` 为主。                                                    |
| `packages/core/src/scene/image-node.ts`                     | M1：解码完成调用 `getStageFromViewNode(this)?.requestPaintOnly()`（或等价），替代无差别 `requestRedrawFromImage()`。                                                                  |
| `packages/core/src/scene/view-node.ts`                      | M4：`interactionState`、`onInteractionStateChange`；可选 `readonly nodeId: symbol`（§13.5）。                                                                                         |
| `packages/core/src/input/canvas-pointer.ts`                 | M3：指针捕获分支；M5：光标写入经 `CursorManager`；M6：`wheel` 链式 `consumeScroll`。                                                                                                  |
| `packages/core/src/input/dispatch.ts` / `hit-test.ts`       | M3/M4/M6：捕获命中绕过、焦点、滚动祖先查找。                                                                                                                                          |
| `packages/core/src/stage/ticker.ts`（新建）                 | M2：`Ticker` 类。                                                                                                                                                                     |
| `packages/core/src/input/cursor-manager.ts`（新建）         | M5：优先级栈与 `applyToCanvas(canvas)`。                                                                                                                                              |
| `packages/core/src/stage/focus-manager.ts`（新建）          | M4：`FocusManager`。                                                                                                                                                                  |
| `packages/core/src/stage/plugin.ts`（新建）                 | M7：`Plugin`、`PluginContext`、钩子类型。                                                                                                                                             |
| `packages/core/src/scene/scroll-view-node.ts`               | M6：`horizontal`、`overscrollBehavior`、`contentWidth`/`contentHeight` 访问器、`clampScrollOffsetsAfterLayout`。                                                                      |
| `packages/core/src/index.ts`                                | 每里程碑导出公共 API。                                                                                                                                                                |
| `apps/core-test/src/demos/*.ts`                             | 每里程碑新增或扩展 demo。                                                                                                                                                             |
| `apps/core-test/CORE_DESIGN_CHECK.md`                       | 每里程碑更新表格行。                                                                                                                                                                  |

---

# M1 — Stage 持有调度器 + 图片重绘按 Stage

### Task M1.1：`Stage` 显式持有 `FrameScheduler`

**Files:**

- Modify: `packages/core/src/stage/stage.ts`
- Modify: `packages/core/src/runtime/frame-queue.ts`
- Test: `packages/core/tests/runtime/frame-queue.test.ts`（调整或新增 `packages/core/tests/stage/stage-scheduler.test.ts`）

- [ ] **Step 1：在 `mountSurface` 成功创建 `surface` 后**实例化 `FrameScheduler`（从 `../runtime/frame-scheduler.ts` 导入），存入 `Stage` 私有字段，例如 `private frameScheduler: FrameScheduler | null = null`，在 `teardownSurface` 中调用 `this.frameScheduler.reset()`（或 `FrameScheduler` 已有等价方法）再 `surface.delete()`。

- [ ] **Step 2：将 `requestLayoutPaint` / `requestPaintOnly` 改为**优先调用 `this.frameScheduler!.queueLayoutPaintFrames(...)` / `queuePaintOnlyFrames(...)`，**不再**传入 `surface` 给 `frame-queue` 的顶层函数（避免 WeakMap 与 Stage 侧实例不一致）。

  ```ts
  // stage.ts 内（示意）
  requestLayoutPaint(root?: ViewNode, camera?: ViewportCamera | null): void {
    const surface = this.surface;
    if (!surface || !this.frameScheduler) throw new Error("...");
    const ck = this.runtime.canvasKit;
    const w = this.width;
    const h = this.height;
    const d = this.dpr;
    if (root !== undefined) {
      this.frameScheduler.queueLayoutPaintFrame(ck, root, w, h, d, camera);
    } else {
      this.frameScheduler.queueLayoutPaintFrames(ck, this.getVisibleLayerRoots(), w, h, d, camera);
    }
  }
  ```

- [ ] **Step 3：`frame-queue.ts` 中 `getScheduler(surface)`** 与 Stage 创建路径统一：可选策略 **A）** `WeakMap` 仍存，但 `Stage` 构造时把同一 `FrameScheduler` 注册进 `WeakMap`；或 **B）** 导出仅用于测试的 `getSchedulerForTests(surface)`，生产路径只走 `Stage`。在计划中 **固定选 A**（更少破坏现有测试对 `queueLayoutPaintFrame(surface, ...)` 的调用）。

- [ ] **Step 4：编写测试** `packages/core/tests/stage/stage-scheduler.test.ts`：创建 `Runtime` + `Stage`，`spy` `surface.requestAnimationFrame`（若已有 helper）或断言 **destroy 后**不再调度（可监听 `frameScheduler` 私有行为通过 `resetLayoutPaintQueue(surface)` 已调用）。

  ```ts
  import { describe, expect, test, afterEach } from "vite-plus/test";
  import { initRuntime } from "../../src/runtime/runtime-init-store.ts";
  import { Stage } from "../../src/stage/stage.ts";

  describe("Stage frameScheduler ownership", () => {
    test("destroy cancels pending work", async () => {
      const runtime = await initRuntime({ loadDefaultParagraphFonts: false });
      const canvas = document.createElement("canvas");
      const stage = new Stage(runtime, { canvas, width: 32, height: 32, dpr: 1 });
      stage.requestLayoutPaint();
      stage.destroy();
      // 断言：无二次 rAF 回调执行（依项目现有 mock 方式实现）
      expect(stage.getSurface()).toBeNull();
    });
  });
  ```

  若环境无 `document`，使用与 `frame-queue.test.ts` 相同的 CanvasKit mock 策略。

- [ ] **Step 5：运行测试**

  Run: `cd /Users/zhouou/Desktop/react-canvas && vp test packages/core`  
  Expected: 全部 PASS。

- [ ] **Step 6：Commit**

  ```bash
  git add packages/core/src/stage/stage.ts packages/core/src/runtime/frame-queue.ts packages/core/tests/stage/stage-scheduler.test.ts
  git commit -m "feat(core): bind FrameScheduler to Stage (M1)"
  ```

### Task M1.2：从任意 `ViewNode` 解析 `Stage`（供 `ImageNode` 重绘）

**Files:**

- Create: `packages/core/src/stage/stage-link.ts`
- Modify: `packages/core/src/stage/layer.ts`
- Modify: `packages/core/src/scene/image-node.ts`
- Modify: `packages/core/src/render/paint-frame-requester.ts`（文档注释 + 可选 deprecation）
- Test: `packages/core/tests/stage/stage-link.test.ts`

- [ ] **Step 1：新建 `stage-link.ts`**，用 `Symbol` 在 **Layer 的 `root` ViewNode** 上挂载 `Stage` 弱可见引用，避免 `ViewNode` 直接 import `Stage` 造成循环：

  ```ts
  import type { ViewNode } from "../scene/view-node.ts";
  import type { Stage } from "./stage.ts";

  const LAYER_ROOT_STAGE = Symbol.for("@react-canvas/core.layerRootStage");

  export function markLayerRootWithStage(root: ViewNode, stage: Stage): void {
    (root as unknown as { [LAYER_ROOT_STAGE]?: Stage })[LAYER_ROOT_STAGE] = stage;
  }

  export function getStageFromViewNode(start: ViewNode | null): Stage | null {
    let n: ViewNode | null = start;
    while (n) {
      const s = (n as unknown as { [LAYER_ROOT_STAGE]?: Stage })[LAYER_ROOT_STAGE];
      if (s) return s;
      n = n.parent;
    }
    return null;
  }
  ```

- [ ] **Step 2：在 `Layer` 构造函数**末尾调用 `markLayerRootWithStage(this.root, this.stage)`。

- [ ] **Step 3：修改 `ImageNode.beginLoad` 内所有 `requestRedrawFromImage()`** 为：

  ```ts
  getStageFromViewNode(this)?.requestPaintOnly();
  ```

  若 `getStageFromViewNode` 返回 `null`（节点未挂树），可 **fallback** `requestRedrawFromImage()` 一次以保持旧行为，并在注释中标为 **迁移期**。

- [ ] **Step 4：单测** `stage-link.test.ts`：`Layer` 上 `add` 子 `ViewNode`，从子节点 `getStageFromViewNode` 应返回正确 `Stage`。

- [ ] **Step 5：`vp test packages/core` → PASS → Commit** `feat(core): resolve Stage from scene nodes for image repaint (M1)`

### Task M1.3（可选，与 spec §13.6）：字体就绪与首帧

**Files:** `packages/core/src/runtime/runtime.ts`、`packages/core/src/stage/stage.ts`、测试。

- [ ] **Step 1：**在 spec 允许的两种策略中选 **一种** 写死：`Stage.waitForFontsReady(): Promise<void>` **或** 文档化「首帧允许跳动」并在测试中跳过。实现对应 Promise 与 `requestLayoutPaint` 门禁。

- [ ] **Step 2：单测 + Commit**

---

# M2 — Ticker（`core-design.md` §9）

### Task M2.1：`Ticker` 类与 `Stage.createTicker()`

**Files:**

- Create: `packages/core/src/stage/ticker.ts`
- Modify: `packages/core/src/stage/stage.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/tests/stage/ticker.test.ts`
- Demo: `apps/core-test/src/demos/demo-animation.ts`（新建或扩展）

- [ ] **Step 1：实现 `Ticker`**（与文档一致）。`requestFrame` / `cancelFrame` 由 `Stage` 注入（绑定 `surface.requestAnimationFrame` / `cancelAnimationFrame`）。**`destroy`** 必须 `cancelFrame` 并清空回调集。核心循环逻辑：

  ```ts
  export class Ticker {
    constructor(
      private readonly requestFrame: (cb: (now: number) => void) => number,
      private readonly cancelFrame: (id: number) => void,
    ) {}

    private rafId: number | null = null;
    private lastNow = 0;
    private active = false;
    private readonly fns = new Set<(deltaMs: number, now: number) => boolean | void>();

    start(): void {
      if (this.active) return;
      this.active = true;
      this.lastNow = performance.now();
      const tick = (now: number) => {
        if (!this.active) return;
        const deltaMs = now - this.lastNow;
        this.lastNow = now;
        for (const fn of [...this.fns]) {
          if (fn(deltaMs, now) === true) this.fns.delete(fn);
        }
        this.rafId = this.requestFrame(tick);
      };
      this.rafId = this.requestFrame(tick);
    }

    stop(): void {
      this.active = false;
      if (this.rafId !== null) this.cancelFrame(this.rafId);
      this.rafId = null;
    }

    destroy(): void {
      this.stop();
      this.fns.clear();
    }

    add(fn: (deltaMs: number, now: number) => boolean | void): () => void {
      this.fns.add(fn);
      return () => this.fns.delete(fn);
    }

    get running(): boolean {
      return this.active;
    }
  }
  ```

- [ ] **Step 2：`Stage.createTicker(): Ticker`**，`Stage.destroy()` 销毁所有 ticker。

- [ ] **Step 3：测试** 回调被调用、`return true` 移除、`destroy` 后不再调用。

- [ ] **Step 4：core-test** 一屏透明度动画；**CORE_DESIGN_CHECK** 增加 §9 行。

- [ ] **Step 5：`vp test` + `vp check` + Commit**

---

# M3 — 指针捕获（§8）

### Task M3.1：`Stage` API + `canvas-pointer` 集成

**Files:**

- Modify: `packages/core/src/stage/stage.ts`
- Modify: `packages/core/src/input/canvas-pointer.ts`
- Modify: `packages/core/src/input/types.ts`（若需扩展事件目标）
- Test: `packages/core/tests/input/pointer-capture.test.ts`

- [ ] **Step 1：`Stage` 维护 `Map<number, ViewNode>`（pointerId → capture target）**，实现 `setPointerCapture` / `releasePointerCapture`。

- [ ] **Step 2：在 `attachCanvasPointerHandlers` 内**，若存在 capture，**跳过 `hitTest`**，将坐标转换后将事件派发到捕获节点（沿用现有 `dispatchBubble` 或文档规定的直投路径）。

- [ ] **Step 3：单测** 模拟 pointerdown → capture → pointermove 在空白处仍命中捕获节点。

- [ ] **Step 4：§13.5**：若捕获表需稳定 id，在 `ViewNode` 构造时 `readonly nodeId = Symbol("ViewNode")` 并在测试中断言。

- [ ] **Step 5：`vp test` + Commit**

---

# M4 — InteractionState + FocusManager（§14）

### Task M4.1：节点状态与焦点管理器

**Files:**

- Create: `packages/core/src/stage/focus-manager.ts`
- Modify: `packages/core/src/scene/view-node.ts`
- Modify: `packages/core/src/input/canvas-pointer.ts` / `dispatch.ts`
- Test: `packages/core/tests/input/interaction-state.test.ts`、`packages/core/tests/stage/focus-manager.test.ts`
- Demo: `apps/core-test` 最小交互 demo

- [ ] **Step 1：`ViewNode` 增加** `interactionState: { hovered: boolean; pressed: boolean; focused: boolean }` 与 `onInteractionStateChange`；**禁止**外部直接赋值（可用小型 helper 或 `Object.freeze` 快照）。

- [ ] **Step 2：`FocusManager`**：`focus(node)` / `blur()`；`pointerdown` 时若目标 `focusable !== false` 则 focus（与 `core-design.md` §14.4 一致）。

- [ ] **Step 3：hover/pressed** 在现有 `hover.ts` / `canvas-pointer` 路径更新。

- [ ] **Step 4：测试 + demo + CORE_DESIGN_CHECK + Commit**

---

# M5 — CursorManager（§15）

### Task M5.1：栈式光标 + 与 hit 路径合并

**Files:**

- Create: `packages/core/src/input/cursor-manager.ts`
- Modify: `packages/core/src/input/canvas-pointer.ts`
- Modify: `packages/core/src/stage/stage.ts`（`readonly cursorManager`）
- Test: `packages/core/tests/input/cursor-manager.test.ts`

- [ ] **Step 1：实现** `push(priority: 'node' | 'plugin' | 'system', cursor: string): () => void`（返回 pop 函数）。

- [ ] **Step 2：`syncCanvasCursor` 改为**取栈顶光标；无栈顶时用原 `resolveCursorFromHitLeaf` 结果作为 **node** 层。

- [ ] **Step 3：单测** plugin 覆盖 node；system 覆盖 plugin。

- [ ] **Step 4：`vp test` + CORE_DESIGN_CHECK + Commit**

---

# 穿插 — §13.3 `Stage.getNodeWorldRect`

### Task MX：`Stage.getNodeWorldRect`

**Files:**

- Modify: `packages/core/src/stage/stage.ts`
- Modify: `packages/core/src/geometry/world-bounds.ts`（复用）
- Test: `packages/core/tests/geometry/world-bounds.test.ts` 或新建

- [ ] **Step 1：实现** `getNodeWorldRect(node: ViewNode): { x: number; y: number; width: number; height: number }`（逻辑坐标，与 `core-design.md` §13.3 一致），内部调用已有 `getWorldBounds` 等。

- [ ] **Step 2：导出 + 单测 + Commit**

---

# M6 — 嵌套滚动 + 水平（§17 + §13.4）

### Task M6.1：`consumeScroll` 与 wheel 链

**Files:**

- Create: `packages/core/src/input/scroll-chain.ts`（或放在 `canvas-pointer.ts` 子模块）
- Modify: `packages/core/src/scene/scroll-view-node.ts`
- Modify: `packages/core/src/input/canvas-pointer.ts`
- Test: `packages/core/tests/scroll-chain.test.ts`
- Demo: `apps/core-test/src/demos/demo-scroll-view.ts` 或新建嵌套 demo

- [ ] **Step 1：实现**文档 `consumeScroll`（`core-design.md` §17.3），含 **`overscrollBehavior`** 为 `contain`/`none` 时 **停止链**（§17.5）。

- [ ] **Step 2：`handleWheel`**：从 `hitTest` 叶向上找 `ScrollViewNode` 链，循环消费 `remainX/remainY`。

- [ ] **Step 3：M6b**：`ScrollViewNode.horizontal: boolean`；wheel 映射 `deltaX`/`deltaY`；文档 §17.6 正交穿透。

- [ ] **Step 4：单测 + demo + CORE_DESIGN_CHECK + Commit**

---

# M7 — 插件系统（§18）

### Task M7.1：`PluginContext` 与 `Stage.use`

**Files:**

- Create: `packages/core/src/stage/plugin.ts`
- Modify: `packages/core/src/stage/stage.ts`
- Modify: `packages/core/src/render/paint.ts` 或 `frame-scheduler.ts`（`onBeforePaint`/`onAfterPaint` 钩子）
- Test: `packages/core/tests/stage/plugin.test.ts`

- [ ] **Step 1：定义** `Plugin` 接口：`install(ctx: PluginContext): void | (() => void)` 或 `dispose` 方法（二选一成文）。

- [ ] **Step 2：`PluginContext`** 含 `stage`、`runtime`、`canvas`、钩子槽（可先仅 `onBeforePaint` + 指针前置钩子之一）。

- [ ] **Step 3：`stage.use(plugin)`** 注册并在 `destroy` 卸载。

- [ ] **Step 4：与 CursorManager** 的 `plugin` 优先级集成测试。

- [ ] **Step 5：`vp test` + CORE_DESIGN_CHECK + Commit**

---

## Spec 覆盖自检（计划作者自检）

| Spec 章节                     | 对应任务  |
| ----------------------------- | --------- |
| M1 帧调度 + 图片按 Stage      | M1.1–M1.2 |
| §13.6 首帧字体                | M1.3      |
| M2 Ticker §9                  | M2.1      |
| M3 指针捕获 §8                | M3.1      |
| M4 InteractionState/Focus §14 | M4.1      |
| M5 Cursor §15                 | M5.1      |
| §13.3 world rect              | MX        |
| M6 滚动 §17、§13.4            | M6.1      |
| M7 插件 §18                   | M7.1      |

## 执行交接

**计划已保存至：** `docs/superpowers/plans/2026-04-10-core-full-capabilities-implementation.md`

**两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 派生子代理执行，任务间人工复核，迭代快。需配合 **superpowers:subagent-driven-development**。
2. **Inline Execution** — 本会话内按 **superpowers:executing-plans** 批量执行并设检查点。

**你希望采用哪一种？**（若直接说「从 M1.1 开始实现」，则视为选择 Inline，从第一个未勾选 Step 做起。）
