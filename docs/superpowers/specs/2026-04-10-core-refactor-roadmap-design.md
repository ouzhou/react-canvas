# `@react-canvas/core` 重构路线图（纵向切片）

**日期：** 2026-04-10  
**状态：** 已定稿（执行层面）  
**关联文档：** [`docs/core-design.md`](../../core-design.md)（架构与 API 细则以该文档为准；本文只定义 **落地顺序、门禁与 §13 处理策略**。）

---

## 1. 背景与目标

- **北极星**：`docs/core-design.md` 所描述的 Runtime / Stage / Layer / 节点 / 布局 / 渲染 / 事件等分层，以及 **react 包变薄**、Surface 与调度从 react 迁入 core（见 `core-design.md` §12）。
- **工程策略**：采用 **纵向切片（A）**——每一阶段在 `@react-canvas/core` 内形成可验证闭环；**允许 `@react-canvas/react`、`@react-canvas/ui`、website 暂时无法通过类型检查或测试**。
- **阶段门禁**：每个切片合并时，**`packages/core` 的测试必须通过**（`vp test` 作用于 core 或仓库约定下的等价命令）；不强制整仓 monorepo 全绿，直至单独开启「修复上层」阶段。

---

## 2. 切片编排原则（在纵向切片下的取舍）

在「纵向切片」之下，采用 **依赖自下而上（主干）** 为主，在 **Surface、帧调度、DOM 指针绑定** 等高风险点 **穿插从 react 包迁出**（避免仅改导出、内核仍是全局队列的双轨状态）。

| 备选            | 要点                                            | 本文取舍                                       |
| --------------- | ----------------------------------------------- | ---------------------------------------------- |
| 自下而上        | Runtime → Stage → 调度 → 场景 → 事件 → 多 Layer | **采用**                                       |
| 迁出 react 优先 | 按 §12.2 列表逐项搬迁                           | **作为各切片内的具体任务，不单独作为唯一顺序** |
| API 门面先行    | 先统一 `initRuntime` 等对外名                   | **可与切片 1 合并，避免长期双轨**              |

---

## 3. 建议阶段（顺序固定为推荐默认）

以下阶段顺序可合并 PR，但 **不建议跳过前置依赖**（除非在 PR 中明确记载技术债与跟进 issue）。

### 阶段 1 — Runtime 契约

- **内容**：与 `core-design.md` §2 对齐：`initRuntime`、`subscribeRuntimeInit`、`getRuntimeSnapshot` / server snapshot 等命名与快照语义；对旧符号采用 re-export 或短生命周期适配，避免无文档的双轨。
- **测试**：多次初始化幂等、loading/ready/error 状态、`useSyncExternalStore` 所需快照形状（若在 core 侧提供辅助）。

### 阶段 2 — Stage 骨架

- **内容**：`Stage` 持有从 `<canvas>` 创建的 Surface、尺寸与 DPR、`resize` / `destroy`；将 **react 包中与 Surface 创建相关的逻辑**（如 `canvas-backing-store` 职责）迁入 Stage 内部实现。
- **测试**：无节点时清屏与呈现、resize 重建 Surface、destroy 释放资源。

### 阶段 3 — 每 Stage 帧调度

- **内容**：每个 `Stage` 独立调度 `requestLayout` / `requestPaint`；**替代或收敛**当前模块级 `frame-queue` / 全局 `paint-frame-requester` 在「Stage 拥有」语义下的用法。
- **测试**：同一 Stage 内请求合并、Stage 销毁后不再调度、多 Stage 隔离（若单测环境可挂多块 canvas）。

### 阶段 4 — 单 Layer + 最小场景

- **内容**：`defaultLayer`（或等价最小挂载点）上挂载现有 `ViewNode` 树，贯通 layout → paint；节点与 paint 实现尽量复用，改动集中在 **挂载根与 Stage/Layer 关系**。
- **测试**：与现有 layout/paint 行为一致的回归测例（迁移或新增于 core）。

### 阶段 5 — 事件闭环

- **内容**：`EventDispatcher`（或等价物）：将 **react 包 `attachCanvasPointerHandlers` 等 DOM 绑定与分发** 迁入并挂到 `Stage`；命中测试沿用 core 现有能力。
- **测试**：合成指针/点击路径、Stage `destroy` 时解除监听。

### 阶段 6 — 多 Layer / overlay / modal

- **内容**：与 `core-design.md` §4 一致；Portal、多 Reconciler 根等 **可在 core 内 Layer 与事件顺序验证后再改 react**。

### 后续切片（独立排期）

伪类系统（§14）、光标栈（§15）、overflow/borderRadius（§16）、嵌套滚动（§17）、插件（§18）等 **不并入阶段 1–6 的必达范围**，按专题拆切片，各自带 core 测试门禁。

---

## 4. 资源与错误处理（横切要求）

- **所有权**：每个切片明确 Surface、帧循环、DOM 监听由 **Stage** 持有；阶段结束时无「react 里还藏一份 Surface 创建」的重复路径（除临时 re-export 外应有删除计划）。
- **失败与销毁**：初始化失败、`destroy()` 后不得再调度或持有 canvas 监听；测试覆盖泄漏与二次 destroy（若适用）。

---

## 5. 测试与上层包

- **门禁**：每切片 **core 测试绿**。
- **上层**：react/ui/website 可红；若需迁移断言，**优先迁到 `packages/core` 测试**。
- **文档**：大架构仍维护 `docs/core-design.md`；本文件仅作 **执行顺序与门禁** 记录。

---

## 6. `core-design.md` §13 待决问题 — 本路线图策略

- **默认**：**按切片延后决策**；在实现某切片时若必须选择，则在该切片 PR 中 **写清假设** 并（如需要）在 `core-design.md` §13 对应条更新「已决」或指向 ADR。
- **建议对齐文档的默认倾向**（非强制）：多 Layer 时 **每 Layer 独立 Reconciler 根**（§13.1）；PointerCapture 用 **节点稳定 id**（§13.5）。具体以落地切片时的实现为准。

---

## 7. 验收（路线图本身）

本路线图验收标准：

- [ ] 阶段 1–6 顺序与门禁如上，且与 `docs/core-design.md` 无矛盾（若矛盾以 **修订 core-design 或本路线图** 之一解决并注明）。
- [ ] 任一新切片 PR 均附带 **core 测试** 更新或等价说明。
- [ ] §13 条目在未实现对应能力前 **不强行关闭**，但不得用模糊表述阻塞阶段 1–5 合并。

---

## 8. 下一步

用户审阅本文后，通过 **writing-plans** 产出分任务实现计划（文件级与测试清单）；实现阶段不在本文件中展开。
