# Core 纵向切片重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 [`docs/superpowers/specs/2026-04-10-core-refactor-roadmap-design.md`](../specs/2026-04-10-core-refactor-roadmap-design.md) 将 `@react-canvas/core` 从现状演进为以 `Stage` 为中心、每实例隔离调度与 Surface 的架构；每阶段 **packages/core 测试全绿**，react/ui/website 可暂时失败。

**Architecture:** 自下而上六阶段：Runtime 契约对齐 → `Stage` 持有 Surface（迁入 backing-store 数学与创建逻辑）→ 每 Stage 帧调度取代/封装全局 queue → `defaultLayer` 挂载场景 → `EventDispatcher` 迁入指针绑定 → 多 Layer。细节以 [`docs/core-design.md`](../../core-design.md) 为准。

**Tech Stack:** TypeScript、Vite+（`vp test` / `vp check`）、CanvasKit WASM、Yoga WASM、Vitest（经 vite-plus）。

---

## 文件与职责总览（落地前锁定边界）

| 路径                                                             | 职责                                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/runtime/runtime.ts`                           | 对外类型：`Runtime` / `RuntimeOptions`（及与现有 `CanvasRuntime` 的别名关系）                                    |
| `packages/core/src/runtime/runtime-init-store.ts`                | 单例初始化状态机；可新增 `initRuntime` 等函数名包装，内部仍调用现有逻辑                                          |
| `packages/core/src/index.ts`                                     | 导出新旧 API；阶段内保持旧导出直至全仓迁移计划明确                                                               |
| `packages/core/src/geometry/canvas-backing-store.ts`（新建）     | 自 `packages/react/src/canvas/canvas-backing-store.ts` 迁入 `gcd` / `canvasBackingStoreSize`（纯函数，无 React） |
| `packages/core/src/stage/stage.ts`（新建）                       | `Stage`：runtime 引用、canvas 尺寸、Surface 生命周期、后续挂调度器                                               |
| `packages/core/src/stage/frame-scheduler.ts`（新建，名称可微调） | 封装原 `frame-queue.ts` 中「每 Surface」状态机；最终由 `Stage` 持有入口                                          |
| `packages/core/src/runtime/frame-queue.ts`                       | 阶段 3 中改为薄封装或内部实现细节，对外逐步改为 `Stage#requestLayout` 等                                         |
| `packages/core/src/input/event-dispatcher.ts`（新建）            | 自 `packages/react/src/input/canvas-pointer.ts` 抽离 DOM 注册与路由；依赖 `Stage` 提供的 `requestLayoutPaint`    |
| `packages/react/src/canvas/canvas.tsx`                           | 阶段 2–5 中逐步改为使用 `Stage` / core 导出；允许暂时无法编译（本计划不强制每步改 react）                        |
| `packages/react/src/canvas/canvas-backing-store.ts`              | Surface 逻辑迁出后删除或变为 re-export `@react-canvas/core`（阶段 2 末尾处理）                                   |

---

## Phase 1：Runtime 契约（`core-design.md` §2）

### Task 1.1：快照类型与函数的新命名（别名）

**Files:**

- Modify: `packages/core/src/runtime/runtime.ts`
- Modify: `packages/core/src/runtime/runtime-init-store.ts`（若需导出 `initRuntime` 包装）
- Modify: `packages/core/src/index.ts`

**Spec（与文档一致）：**

- `Runtime` ≡ 现有 `CanvasRuntime`
- `RuntimeOptions` ≡ 现有 `InitCanvasRuntimeOptions`
- `RuntimeInitSnapshot` ≡ 现有 `CanvasRuntimeInitSnapshot`（字段名 `status: "idle" | "loading" | "ready" | "error"`）
- `initRuntime` → 调用现有 `initCanvasRuntime`
- `subscribeRuntimeInit` → `subscribeCanvasRuntimeInit`
- `getRuntimeSnapshot` → `getCanvasRuntimeInitSnapshot`
- `getRuntimeServerSnapshot` → `getCanvasRuntimeInitServerSnapshot`

- [ ] **Step 1：在 `runtime.ts` 增加类型别名与 re-export**

在 `packages/core/src/runtime/runtime.ts` 追加（保留原有 export）：

```ts
/** 与 `core-design.md` §2 对齐的文档化类型名 */
export type Runtime = CanvasRuntime;
export type RuntimeOptions = InitCanvasRuntimeOptions;
export type { CanvasRuntimeInitSnapshot as RuntimeInitSnapshot } from "./runtime-init-store.ts";
```

- [ ] **Step 2：在 `runtime-init-store.ts` 追加函数别名**

```ts
export const initRuntime = initCanvasRuntime;
export const subscribeRuntimeInit = subscribeCanvasRuntimeInit;
export function getRuntimeSnapshot(): CanvasRuntimeInitSnapshot {
  return getCanvasRuntimeInitSnapshot();
}
export function getRuntimeServerSnapshot(): CanvasRuntimeInitSnapshot {
  return getCanvasRuntimeInitServerSnapshot();
}
```

注意：`initRuntime` 若放在 `runtime-init-store.ts`，需在 `runtime.ts` 从该文件 re-export，避免重复实现。

- [ ] **Step 3：更新 `packages/core/src/index.ts`**

追加导出：`Runtime`, `RuntimeOptions`, `RuntimeInitSnapshot`, `initRuntime`, `subscribeRuntimeInit`, `getRuntimeSnapshot`, `getRuntimeServerSnapshot`（与旧名并列导出）。

- [ ] **Step 4：`vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: 通过（允许 react 包已有错误时仅验证 core — 若 monorepo 一体检查失败，使用 `vp check packages/core` 或项目文档中的包级命令）。

- [ ] **Step 5：Commit**

```bash
git add packages/core/src/runtime/runtime.ts packages/core/src/runtime/runtime-init-store.ts packages/core/src/index.ts
git commit -m "feat(core): add Runtime API aliases per core-design §2"
```

---

### Task 1.2：Runtime 初始化测试

**Files:**

- Create: `packages/core/tests/runtime/runtime-init.test.ts`

- [ ] **Step 1：编写测试（新文件）**

```ts
import { describe, expect, test, vi, beforeEach, afterEach } from "vite-plus/test";
import {
  getRuntimeSnapshot,
  initRuntime,
  subscribeRuntimeInit,
} from "../../src/runtime/runtime-init-store.ts";

describe("runtime init (documented API)", () => {
  test("getRuntimeSnapshot matches subscribeRuntimeInit emissions", async () => {
    const spy = vi.fn();
    const unsub = subscribeRuntimeInit(spy);
    const p = initRuntime({ loadDefaultParagraphFonts: false });
    await p;
    expect(spy).toHaveBeenCalled();
    const snap = getRuntimeSnapshot();
    expect(snap.status === "ready" || snap.status === "error").toBe(true);
    unsub();
  });
});
```

说明：若当前测试环境 **必须** 加载字体才能 ready，则改用 `loadDefaultParagraphFonts: true` 并确保测试环境有网络或 mock；或与现有 `frame-queue.test.ts` 的环境保持一致。

- [ ] **Step 2：运行测试**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp exec vitest run packages/core/tests/runtime/runtime-init.test.ts`  
（若项目用 `vp test -- packages/core` 则替换为仓库惯例。）  
Expected: PASS

- [ ] **Step 3：Commit**

```bash
git add packages/core/tests/runtime/runtime-init.test.ts
git commit -m "test(core): cover Runtime snapshot API"
```

---

## Phase 2：Stage 骨架 + Surface

### Task 2.1：迁入 `canvasBackingStoreSize`

**Files:**

- Create: `packages/core/src/geometry/canvas-backing-store.ts`（从 `packages/react/src/canvas/canvas-backing-store.ts` 原样复制）
- Modify: `packages/core/src/index.ts`（导出 `gcd`, `canvasBackingStoreSize`）
- Modify: `packages/react/src/canvas/canvas-backing-store.ts` 改为 `export { gcd, canvasBackingStoreSize } from "@react-canvas/core"`（或删除并由 importer 改路径 — 二选一，保持单源）

- [ ] **Step 1：复制文件并导出**
- [ ] **Step 2：`vp check`**
- [ ] **Step 3：Commit** `feat(core): move canvas backing store sizing to core`

---

### Task 2.2：`Stage` 类（创建 Surface、resize、destroy）

**Files:**

- Create: `packages/core/src/stage/stage.ts`
- Create: `packages/core/tests/stage/stage-surface.test.ts`

**接口（与 `core-design.md` §3.3 对齐的最小子集）：**

```ts
import type { CanvasKit, Surface } from "canvaskit-wasm";
import type { Runtime } from "../runtime/runtime.ts";
import { canvasBackingStoreSize } from "../geometry/canvas-backing-store.ts";

export type StageOptions = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  dpr?: number;
};

export class Stage {
  readonly runtime: Runtime;
  private surface: Surface | null = null;
  // constructor 内：MakeWebGLCanvasSurface / MakeSWCanvasSurface 与 canvas.tsx 逻辑一致
  resize(width: number, height: number): void {
    /* 重建或更新 backing store */
  }
  destroy(): void {
    /* surface.delete(), 清空引用 */
  }
  getSurface(): Surface | null {
    return this.surface;
  }
}
```

- [ ] **Step 1：实现 `Stage` 构造函数中的 Surface 创建**（逻辑参考 `packages/react/src/canvas/canvas.tsx` 约 165–182 行）。
- [ ] **Step 2：测试：创建 Stage、断言 `getSurface()` 非 null、`destroy` 后可再创建**（需 CanvasKit：复用现有测试里 `initCanvasKit` / mock 模式，见 `packages/core/tests/helpers/matrix-mock-canvas-kit.ts`）。
- [ ] **Step 3：导出 `Stage` from `index.ts`**
- [ ] **Step 4：`vp test`（core 包）**
- [ ] **Step 5：Commit**

---

## Phase 3：每 Stage 帧调度

### Task 3.1：将 `WeakMap<Surface, …>` 状态挂到 `Stage` 或 `FrameScheduler`

**Files:**

- Modify: `packages/core/src/runtime/frame-queue.ts`
- Modify: `packages/core/src/stage/stage.ts`
- Modify: `packages/core/tests/runtime/frame-queue.test.ts`（更新导入与调用方式）

**目标：** 对外 API 出现 `stage.requestLayout()` / `stage.requestPaint()`（命名以 `core-design.md` §10 为准），内部仍调用现有 `queueLayoutPaintFrame` 逻辑或内联迁移。

- [ ] **Step 1：在 `Stage` 上增加 `requestLayoutPaint(root: ViewNode, camera?: ViewportCamera | null)` 方法**，内部调用现有 `queueLayoutPaintFrame(this.surface!, …)`。
- [ ] **Step 2：运行 `packages/core/tests/runtime/frame-queue.test.ts`，必要时改为通过 `Stage` 构造路径触发队列。**
- [ ] **Step 3：Commit**

### Task 3.2：收敛 `paint-frame-requester.ts`

**Files:**

- Modify: `packages/core/src/render/paint-frame-requester.ts`

**目标：** 图像解码完成后的重绘请求关联到 **持有该内容的 Stage**（若当前无 Stage 引用，本任务在 Stage 可传入 `registerPaintFrameRequester(stage)` 或回调前记录 `stage`）。以 `core-design.md` §7 / §12 为准，避免全局广播。

- [ ] **Step 1：阅读 `registerPaintFrameRequester` 全文件，设计最小改动使重绘走 `Stage.requestPaint`。**
- [ ] **Step 2：补充或调整 `packages/core` 内使用该 requester 的测试。**
- [ ] **Step 3：Commit**

---

## Phase 4：单 Layer + 最小场景

### Task 4.1：`Layer` 与 `defaultLayer`

**Files:**

- Create: `packages/core/src/stage/layer.ts`（若文档 §4 要求独立文件）
- Modify: `packages/core/src/stage/stage.ts`

**目标：** `stage.defaultLayer` 作为 `ViewNode` 树的挂载根（或持有 yoga 根），`Stage` 的 `requestLayoutPaint` 默认针对该层根节点。

- [ ] **Step 1：实现最小 `Layer` 类型与 `Stage.defaultLayer`。**
- [ ] **Step 2：从 `packages/core/tests/scene/view-node-tree.test.ts` 或新建测试：在 `defaultLayer` 根上 append 子节点并 paint。**
- [ ] **Step 3：Commit**

---

## Phase 5：事件闭环

### Task 5.1：迁入 `attachCanvasPointerHandlers`

**Files:**

- Create: `packages/core/src/input/event-dispatcher.ts`（或 `stage-pointer.ts`）
- Modify: `packages/react/src/input/canvas-pointer.ts`（薄 re-export 或删除）
- Modify: `packages/core/src/stage/stage.ts`：`attachPointerHandlers()` 返回 `() => void`

**目标：** `clientToCanvasLogical`、`attachCanvasPointerHandlers` 的核心逻辑位于 core；`Stage` 在构造或显式方法里绑定 canvas，销毁时解除。

- [ ] **Step 1：剪切 `canvas-pointer.ts` 中不依赖 React 的函数至 core，参数中保留 `requestLayoutPaint: () => void`。**
- [ ] **Step 2：运行 `packages/core/tests/input/*.test.ts` 中与指针相关的用例；必要时把集成测迁到 `packages/core/tests/stage/stage-pointer.test.ts`。**
- [ ] **Step 3：Commit**

---

## Phase 6：多 Layer / overlay / modal

### Task 6.1：`overlayLayer` / `modalLayer` 与 z 排序

**Files:**

- Modify: `packages/core/src/stage/stage.ts`
- Modify: `packages/core/src/stage/layer.ts`
- Create: `packages/core/tests/stage/layer-order.test.ts`

**目标：** 与 `core-design.md` §4 一致：内置三层；事件逆序 hit-test；`modalLayer` 默认 `captureEvents`（若文档已定义）。

- [ ] **Step 1：实现多 `Layer` 与绘制顺序。**
- [ ] **Step 2：单测覆盖 layer 顺序与命中顺序。**
- [ ] **Step 3：Commit**

---

## 横切与收尾

- [ ] **更新 `docs/core-design.md` 顶部「状态」与 §12 迁移表勾选（可选，与路线图一致时）。**
- [ ] **列 issue：「修复 @react-canvas/react 使用 Stage」作为独立里程碑。**
- [ ] **全仓 `vp check` + `vp test`（在允许上层修复后）。**

---

## Spec 覆盖自检

| 路线图 / core-design 要求              | 对应任务                   |
| -------------------------------------- | -------------------------- |
| §2 Runtime API 命名                    | Phase 1                    |
| Stage 持有 Surface、react 迁出 backing | Phase 2                    |
| 每 Stage 帧调度、弱化全局 queue        | Phase 3                    |
| defaultLayer 场景                      | Phase 4                    |
| EventDispatcher / 指针迁入 core        | Phase 5                    |
| 多 Layer                               | Phase 6                    |
| §13 延后                               | 各 Phase PR 描述中记录假设 |

## 占位符扫描

本计划不包含 TBD/TODO 实现块；具体 `Stage`/`Layer` 方法名若在编码时与 `core-design.md` §3–§4 有出入，以 **更新本文档相应小节** 或 **更新设计文档** 二选一固定为准。

## 类型一致性

- `Runtime` 与 `CanvasRuntime` 为别名，后续任务统一称 `Runtime`（Stage 构造函数参数）。
- 快照类型使用 `RuntimeInitSnapshot` 新名时须与 `CanvasRuntimeInitSnapshot` 结构完全相同。

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-10-core-refactor-implementation.md`. Two execution options:**

1. **Subagent-Driven（推荐）** — 每任务派生子代理，任务间人工复核，迭代快。
2. **Inline Execution** — 本会话按 `executing-plans` 连续执行，批量提交并设检查点。

你想用哪一种？
