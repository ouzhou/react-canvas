# `@react-canvas/core` 全量能力里程碑（`core-design.md` §8–§18 与 §13）

**日期：** 2026-04-10  
**状态：** 已定稿（执行顺序与门禁）  
**关联文档：**

- [`docs/core-design.md`](../../core-design.md) — 架构与 API 细则仍以该文档为权威；本文只定义 **§9–§18 及 §13 相关待决项** 的落地顺序、里程碑验收与边界。
- [`2026-04-10-core-refactor-roadmap-design.md`](./2026-04-10-core-refactor-roadmap-design.md) — Stage/Runtime/纵向切片 1–6；本文 **从 M1 起承接其「阶段 3–6 之后」的专题能力**，避免重复定义已完成或未定的基础切片。

---

## 1. 背景与目标

- **触发**：在 [`docs/core-design.md`](../../core-design.md) 中，§8（指针捕获）、§9（Ticker）、§10（每 Stage 帧调度）、§14–§18 及 §13 部分条目在 `packages/core` 中尚未完整落地；[`apps/core-test/CORE_DESIGN_CHECK.md`](../../../apps/core-test/CORE_DESIGN_CHECK.md) 亦列出待可视化或仅文档级的能力。
- **目标**：给出 **可交付、可测试** 的多阶段里程碑；每阶段结束 **`packages/core` 测试必须通过**（`vp test` 或仓库约定等价命令），并在 `apps/core-test` 增加或更新 demo / 核对表行（与现有 demo 风格一致）。
- **非目标（本 spec 不规定实现细节）**：
  - `@react-canvas/react` 的 HostConfig、`commitUpdate` 对 `_hover` / `_active` 的合并（见 `core-design.md` §14.6）— 仅要求 core 提供 `InteractionState` 与回调契约。
  - `@react-canvas/ui` 的 `Pressable`、主题等 — 可在 core 契约稳定后单独排期。

---

## 2. 实施顺序：三种方案与取舍

| 方案                             | 做法                                                                                                                                  | 取舍                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **A — 基础设施优先（本文采用）** | 帧调度收口 → Ticker → 指针捕获 → InteractionState + FocusManager → CursorManager → 滚动（嵌套 + 水平）→ 插件；§13 工具 API 按依赖穿插 | 与 `core-design.md` 数据流一致，动画与捕获不依赖伪类；先减少全局队列与销毁问题，后续少返工。 |
| B — 体验优先                     | 先做 §14 / §15，再 Ticker 与调度                                                                                                      | 产品可见早，但若调度边界未收口，焦点与 Ticker 易与 `requestPaint` 纠缠。                     |
| C — 纯依赖极小步                 | 与 A 相近，里程碑更碎                                                                                                                 | 适合多人并行；单线程开发时管理成本高。                                                       |

**结论**：采用 **方案 A**。

---

## 3. 里程碑定义

### M1 — 每 Stage 帧调度收口（`core-design.md` §10）

- **交付**：`FrameScheduler`（或等价物）由 `Stage` 持有；`frame-queue.ts` 对外语义收敛为 **按 Stage/Surface 实例隔离**，`Stage.destroy()` 取消待执行 rAF、无泄漏；与图片解码触发的重绘路径统一为 **当前 Stage** 的 `requestPaint` / 等价调用，取消「全局广播」语义（与现有 `registerPaintFrameRequester` 的衔接在实现计划中写清单）。
- **验收**：单测覆盖多 `Stage` 实例互不抢帧、destroy 后不再调度；必要时迁移或增补自 `2026-04-10-core-refactor-implementation.md` 中阶段 3 相关任务。

### M2 — 动画 Ticker（§9）

- **交付**：`Ticker` 类与 `stage.createTicker()`，API 形状与 `core-design.md` §9 一致：`add` 回调返回 `true` 表示结束并移除、`start` / `stop` / `destroy`、生命周期与 `Stage` 绑定。
- **验收**：`packages/core` 单测 + `apps/core-test` 独立 demo（例如 opacity 或 transform 驱动 `requestPaint`）。

### M3 — 指针捕获（§8）

- **交付**：`Stage.setPointerCapture(node, pointerId)`、`Stage.releasePointerCapture(node, pointerId)`；激活后对应 `pointerId` 的 `pointermove` / `pointerup` 按文档跳过命中测试并派发到捕获节点。
- **验收**：单测覆盖拖拽移出元素仍收到事件；与 `attachCanvasPointerHandlers` 集成无重复监听泄漏。

### M4 — 交互态与焦点（§14 的 core 子集）

- **交付**：`ViewNode` 上只读 `interactionState`（hovered / pressed / focused）、`onInteractionStateChange`；`FocusManager`（`focus` / `blur`、可选 `focusNext` / `focusPrev` 可先 stub）；`pointerdown` 与可聚焦策略与 `core-design.md` §14.4 一致；若需稳定节点标识以支持捕获表，采用 `core-design.md` §13.5 建议的 `readonly id: symbol` 及 Stage 侧 Map。
- **验收**：单测 + 最小 demo（无需 React）。

### M5 — 光标栈 CursorManager（§15）

- **交付**：优先级 **node &lt; plugin &lt; system** 的栈式 `CursorManager`；与现有 `resolveCursorFromHitLeaf` / `canvas.style.cursor` 写入点合并，避免插件拖拽与 hover 光标互相覆盖闪烁。
- **验收**：单测模拟多来源压栈/弹栈；demo 或测试脚本验证 plugin 可临时覆盖 node。

### M6 — 滚动（§17 与 §13.4）

- **交付**：
  - **M6a（必达）**：嵌套 `ScrollView` 的滚动链、`consumeScroll` 类语义（与 `core-design.md` §17 一致）、`overscrollBehavior` 若文档有则按最小可用子集实现。
  - **M6b（可与 M6a 同 PR 或紧随）**：水平滚动：`horizontal` 显式 prop（**本 spec 固定选用显式布尔**，结束 §13.4「待决」在实现层的歧义）；wheel 对 `deltaX` / `deltaY` 的处理与文档一致。
- **验收**：`apps/core-test` 嵌套滚动 demo；水平滚动单独或同页 tab。

### M7 — 插件系统（§18）

- **交付**：`Plugin` 接口、`PluginContext`、`Stage.use()`（或等价注册 API），生命周期与 `Stage.destroy` 对称；与 M5 的 system/plugin 光标优先级协同。
- **验收**：单测注册/卸载；最小「viewport 类」插件 demo 或测试替身。

### 穿插 — §13 工具与待决收口

| 条目                          | 纳入时机                             | 说明                                                                                                                                         |
| ----------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| §13.3 跨 Layer 坐标           | M4 之后、M7 之前（建议 **M5 前后**） | 提供 `Stage.getNodeWorldRect(node)` 或与现有 `getWorldBounds` 组合的 **稳定对外 API**，供 overlay 定位；行为与 `core-design.md` §13.3 一致。 |
| §13.5 PointerCapture 节点标识 | M3 或 M4                             | 若 M3 实现依赖稳定 id，与 §13.5 同时落地。                                                                                                   |
| §13.6 首帧文字抖动            | 独立小步或并入 M1/M2                 | `waitForReady` 或「字体就绪后再首绘」二选一须在实现计划中写死；本 spec 仅要求 **有明确门禁与测试**。                                         |
| §13.7 `node.currentStyle`     | 可选                                 | 非阻塞；若 reconciler 路径不需要则可文档标注「仅命令式便利」。                                                                               |

---

## 4. 架构与数据流（约束）

- **Ticker**：只负责帧回调；缓动/插值不进入 core。
- **FrameScheduler**：同一帧合并 `needsLayout` 与 `needsPaint`；与图片异步解码的触发器统一走 Stage 作用域。
- **InteractionState**：仅由事件管线与 `FocusManager` 写入；外部只读。
- **CursorManager**：在写入 `canvas.style.cursor` 前解析栈顶。
- **插件**：不得绕过 Stage 的调度与销毁契约。

---

## 5. 与 `core-design.md` 的关系

- 本文件 **不替代** `docs/core-design.md`；若实现中发现 API 与原文冲突，以 **单独 PR 更新 `core-design.md` 对应小节并标注修订日期** 为准。
- 与 **纵向切片路线图** 的关系：见 [`2026-04-10-core-refactor-roadmap-design.md`](./2026-04-10-core-refactor-roadmap-design.md)；本文 M1–M7 在阶段 3–6 具备后继续执行。

---

## 6. 测试与文档门禁

- 每里程碑合并前：**`packages/core` 测试全绿**；允许 monorepo 其他包暂时失败（与既有路线图策略一致）。
- 更新 [`apps/core-test/CORE_DESIGN_CHECK.md`](../../../apps/core-test/CORE_DESIGN_CHECK.md) 表格行，使 §9–§18 能力与 demo 可追踪。

---

## 7. 风险与缓解

- **M1 调用面宽**：维护 `frame-queue` / `requestLayoutPaint` 迁移清单，必要时保留短期别名并标 `@deprecated`。
- **M6 范围大**：允许 M6a / M6b 分 PR；先保证竖向嵌套再合横向，避免同时改 wheel 与手势判定导致回归难查。

---

## 8. 下一动作

- 审阅本 spec 通过后，使用 **writing-plans** 生成与各里程碑对应的实现计划（任务拆分、文件触点、顺序依赖）。
- 实现阶段遵循仓库 **Vite+** 工作流：`vp check`、`vp test`（见根目录 `AGENTS.md`）。
