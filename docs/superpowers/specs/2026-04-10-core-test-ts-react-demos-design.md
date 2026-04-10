# core-test：原生 TS 与 React 双实现对照 — 设计说明

**状态：已定稿（2026-04-10）**  
**范围：`apps/core-test`**

## 1. 背景与目标

`apps/core-test` 是 `@react-canvas/core` 的可视化验收应用：左侧按 `docs/core-design.md` §1–§18 列出 demo，主区挂载画布与说明。当前实现均为**原生 TypeScript**（`initCanvasRuntime`、`Stage`、imperative 节点树）。

**目标**：在同一应用内，为可对齐的 demo 增加 **React** 实现（`@react-canvas/react` 的 `CanvasProvider`、`<Canvas>` 与 reconciler 宿主组件），使每个条目在「实现」维度上可与原生 TS **对照**，便于验收与文档引用。

**非目标**：不改变 core 包公共 API 语义；不把 demo 逻辑上收到 `packages/core` 内。

## 2. 约束与范围例外

### 2.1 「无 React 对照」的条目

以下 demo 在语义上强调「不经过 React」或「仅依赖 core」，**不提供**与 TS 版平行的 React 场景实现：

- **`standalone`**（§11 独立使用 API）
- **`package`**（§12 包边界）

在用户选择 **React** 时：这些条目**不挂载画布**；主区可留白或展示一句简短说明（文案不强制，允许极简占位）。不要求为它们编写 `CanvasProvider` 包装版。

### 2.2 其余条目

除上述两 id 外，**应对齐提供 React 版**（与 TS 版相同的验收意图：hint、status、可观察交互行为一致）。实现可分多次提交合并，但**交付标准**为对照表完整、可运行。

## 3. 用户体验

### 3.1 实现切换

在现有 shell（侧栏 + 主区）上增加 **实现** 切换：**原生 TS** | **React**。侧栏 demo 列表保持「一条目一章节」，不拆成两条导航。

### 3.2 URL 与可分享状态

- 保留现有 **`demo`** 查询参数（demo id）。
- 新增 **`impl`** 查询参数：`ts` | `react`，**默认 `ts`**。
- 切换 demo 或实现时使用 `history.replaceState` 与当前行为一致，便于分享与回归。

### 3.3 生命周期

切换 **demo** 或 **impl** 时：必须先执行现有 **`cleanup`**，清空画布容器，再挂载新内容，避免双画布、事件泄漏或未卸载的 React root。

## 4. 技术方案（推荐）

### 4.1 平行文件 + 集中分发

- 保留现有 `src/demos/demo-*.ts` 及 `mountXxxDemo`。
- 为可对齐的 demo 增加并列文件（命名约定示例：`demo-<name>.react.tsx`），导出 `mountXxxDemoReact`；**函数签名**尽量与 TS 版一致：`(container: HTMLElement, ...callbacks) => Promise<() => void>` 或同步返回 `cleanup`（与现有一致即可）。
- 在 `src/main.ts`（或抽出的薄路由模块）根据 **`impl`** 选择调用 TS 或 React 挂载。

若在个别 demo 中出现大量重复且易漂移，**允许局部**抽取共享 helper（例如常量尺寸、共享文案）；**不强制**一开始就全局抽象场景构建层。

### 4.2 React 挂载

- `apps/core-test` 增加依赖：`react`、`react-dom`、`@react-canvas/react`（workspace）。
- 在 `#demo-canvas-wrap` 内使用 **`createRoot`**；**cleanup** 中 **`root.unmount()`**，并与 imperative 路径的 **`stage.destroy()` / dispose** 等资源释放对称。

### 4.3 与现有宿主对齐

TS 版使用 `src/lib/stage-demo-host.ts` 的 `createStageDemoHost`。React 版使用包内公开的 **`CanvasProvider` + `<Canvas>`** 等 API，场景树用 reconciler 提供的宿主组件复刻 TS 版结构与行为。

## 5. 文件与目录

- 推荐将 React demo 与 TS demo **放在同一目录**（`src/demos/`），通过后缀区分，便于 diff 与评审。
- `main.ts` 中 import 与 `if/else` 或映射表集中管理，避免散落魔法字符串。

## 6. 验收与质量门禁

- 变更需通过仓库惯例的 **`vp check`**；若 `core-test` 后续增加测试，则 **`vp test`** 相关包也需通过。
- 手工验收：对每个有对照的 id，在 TS 与 React 间切换无报错、无残留 DOM/canvas、核心交互与 TS 版一致。

## 7. 后续工作

本设计获批并落盘后，单独产出 **实现计划**（`writing-plans`），再进入编码；实现计划需列出：依赖变更、`main.ts` 与 URL 解析、`impl` UI、各 demo 文件清单及「无对照」分支行为。
