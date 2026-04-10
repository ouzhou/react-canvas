# V2：SceneRuntime + Yoga + 事件管线（无绘制）— 设计说明

**状态：已定稿（待实现计划）**  
**日期：2026-04-10**  
**范围：`packages/core-v2`、`packages/react-v2`、`apps/v2`**

---

## 1. 背景与目标

在 **不实现任何像素绘制** 的前提下，重启 **V2** 技术栈：先落地 **Yoga 布局树**、**完整事件管线**（命中 + 捕获/冒泡），并把 **`core-v2` → `react-v2` → `apps/v2`** 串联起来。`apps/v2` 通过 **多块可折叠 JSON** 观察 **场景结构、布局结果、最近一次程序化派发追踪**，便于调试与验收。

语义上与 `docs/event-system.md` 对齐：**target 由 hit test 唯一确定**；冒泡沿 **场景 parent 链**；兄弟叠放与 Yoga 文档顺序的关系见 §4。

**非目标**：不改变 `packages/core`（v1）公共 API；本规格仅约束 V2 新包。

---

## 2. 已确认的决策摘要

| 主题         | 决策                                                                                   |
| ------------ | -------------------------------------------------------------------------------------- |
| 事件管线深度 | **A**：坐标 → Yoga 矩形 hit test → target → **捕获/冒泡**（不绘制）。                  |
| 指针输入     | **程序化注入**（单测、`apps/v2` 内按钮/数值触发）；**不接** DOM `PointerEvent`。       |
| 调试展示     | **d**：场景树 JSON + 布局 JSON + 最近派发追踪 JSON，**分块/折叠**展示，避免单屏过大。  |
| React 公开面 | **`<CanvasRuntime>`**（根）+ **`<View>`**（子节点），命名贴近 RN 心智。                |
| 包结构       | **单包 `core-v2`**，内用文件/目录划分模块；对外一个入口，待 API 稳定后再议是否拆子包。 |

---

## 3. 分层职责

### 3.1 `@react-canvas/core-v2`

唯一真相：**场景树**、**Yoga 计算**、**命中**、**事件管线**、**可序列化快照**。

- 对外主对象称 **`SceneRuntime`**（由 `createSceneRuntime(options)` 创建，或等价工厂）。**不与** React 根组件同名（React 侧使用 `CanvasRuntime`）。

### 3.2 `@react-canvas/react-v2`

- **`<CanvasRuntime>`**：创建并持有 `SceneRuntime`，向子树提供上下文；接收根 **视口尺寸**（Yoga 根约束）。
- **`<View>`**：映射为场景节点；`style` → Yoga 允许子集；事件 props → core 监听。

### 3.3 `apps/v2`

演示应用：**嵌套 `View`**、**程序化派发**控件、**三块 JSON** 折叠 UI。不包含业务绘制。

---

## 4. 坐标系、布局与命中规则

### 4.1 坐标系

- **单一 Stage 坐标系**：原点 **左上角**，**x 向右、y 向下**。
- 所有程序化派发 API 使用 **Stage 坐标**。未来若接入 DOM 指针，仅在边界增加 **DOM → Stage** 变换，**不修改** core 管线语义。

### 4.2 布局

- 树或样式变更后执行 Yoga **`calculateLayout`**；读出各节点 **轴对齐包围盒**。
- 实现须 **固定一种** 矩形表示（相对根或相对父）并在命中前 **统一换算到 Stage**；细节由实现计划与代码约定，本规格只要求 **行为可测、与 JSON 一致**。

### 4.3 兄弟顺序与「最上」节点（本阶段）

- **不实现** `zIndex`、多 Layer、整层 `captureEvents`（见 §7）。
- **叠放顺序**：与 **当前 Yoga 子节点数组顺序** 一致——**靠后的子节点在上**（为将来绘制顺序预留）。
- **命中顺序**：在同一父节点下，自 **最后一个子节点向第一个** 遍历，**第一个包含点 (x,y) 的节点** 为 **唯一 target**。

### 4.4 事件管线

- **类型（首版）**：实现 **`pointerdown`**、**`pointerup`**、**`click`** 三种；测试需覆盖命中与传播路径。
- **阶段**：**捕获**（根 → target）与 **冒泡**（target → 根）。
- **传播控制**：首版 **须支持** `stopPropagation`（或等价机制），以便单测与 JSON 追踪中断言传播链。

---

## 5. API 草图

### 5.1 `SceneRuntime`（core）

| 能力   | 说明                                                                                                                                                              |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 创建   | `createSceneRuntime(options)`：`options` 至少含根 **宽度/高度**（如 `width: 800, height: 600`）。                                                                 |
| 树变更 | 由 **react-v2** 在内部调用插入/更新/删除节点及 **Yoga 样式子集**（不必对最终应用开发者全量导出 imperative API，但 **必须可被 React 层稳定驱动**）。               |
| 布局   | 树变更后 **自动** `calculateLayout`（推荐），或显式 `layout()`；二选一整仓一致。                                                                                  |
| 派发   | `dispatchPointerLike(eventLike)`：`{ type, x, y, ... }`，Stage 坐标下完成 hit + 捕获/冒泡。                                                                       |
| 监听   | 节点级按类型注册；与 `View` 的 `onClick` 等对齐。                                                                                                                 |
| 快照   | 提供 **`getSceneGraphSnapshot()`**、**`getLayoutSnapshot()`**、**`getLastDispatchTrace()`**（或等价的 `getDebugState()` 再拆分），结构稳定、可 `JSON.stringify`。 |

### 5.2 `CanvasRuntime` + `View`（react-v2）

- **`<CanvasRuntime>`**：`children` 以 **`View` 子树** 为主；`width`/`height`（或等价 props）传入 core 根视口。
- **`<View>`**：`style`（Yoga 子集）、嵌套 `children`、事件如 `onPointerDown`、`onClick`（首版可只接 **一两个** 最常用，其余列入后续）。
- 可选：向 `apps/v2` 暴露 **`useSceneSnapshot()`** 或 `onDebugStateChange` 以刷新 JSON 面板。

### 5.3 `apps/v2`

- 从 runtime 取得 **派发函数**（ref/context）与 **三块快照**，用 **`<details>` / 折叠面板** 等分开展示。

---

## 6. 测试策略

| 层级         | 内容                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| **core-v2**  | 树与布局数值、**命中顺序**、**捕获/冒泡路径**、`stopPropagation`、快照序列化；**无 React、无 DOM**。        |
| **react-v2** | `CanvasRuntime` + `View` 与 core 的同步；可选 mock 或集成 **真实 SceneRuntime**（实现计划里选定一种为主）。 |
| **apps/v2**  | 手工联调为主；可选极薄 smoke，**复杂逻辑不放在应用层**。                                                    |

门禁：相关包 **`vp check`**、**`vp test`** 通过（与仓库 `AGENTS.md` 一致）。

---

## 7. 明确排除项

- 任何 **Skia / Canvas2D / 位图** 等绘制。
- **DOM `PointerEvent`** 接入。
- **`zIndex`、多 Layer、整层捕获**、滚动链、hover、`pointermove` 目标切换、指针捕获、键盘焦点等（见 `docs/event-system.md` §7）。
- 与 **v1 `packages/core` 运行时** 的 API 级兼容（可思想对齐，不强制）。

---

## 8. 相关文档

- `docs/event-system.md` — 事件与 Yoga 下的设计原则。
- `docs/core-design.md` — v1 总体设计；V2 独立演进，仅作参考。

---

## 9. 修订记录

| 日期       | 说明                             |
| ---------- | -------------------------------- |
| 2026-04-10 | 初稿：brainstorming 三节合并定稿 |
