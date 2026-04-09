# 运行时结构约束 — 检测设计

本文说明 **如何在运行时强制** [development-roadmap.md](../development-roadmap.md) 中的结构规则（**R-ROOT** / **R-HOST** / **R-MULTI** / **R-PORTAL**），与 [phase-1-design.md](./phase-1-design.md)、[hostconfig-guide.md](./hostconfig-guide.md) 中的 Reconciler 流程一致。

**原则：非法结构须 `throw`（或等价失败），禁止仅靠文档或类型提示。** 可选的 `console.warn` 仅用于弃用 API、性能提示等，不用于替代结构校验。

---

## 1. 规则 ID 与检测职责对照

| 规则 ID        | 检测职责摘要                                                                         |
| -------------- | ------------------------------------------------------------------------------------ |
| **R-ROOT-1**   | `<Canvas>` 必须在就绪的 `CanvasProvider` Context 内使用。                            |
| **R-ROOT-2**   | 宿主节点仅能通过本库 Reconciler 进入场景树；对外 API 勿误导在 DOM 中误用宿主组件。   |
| **R-HOST-1**   | `View` 下允许 `Text`（允许则无需在 `createInstance` 拦截）。                         |
| **R-HOST-2**   | `Text` 内禁止 `View`（及块级宿主名单）；**必须抛错**，信息须可读。                   |
| **R-HOST-3**   | `Text` 内允许嵌套 `Text` 与文本叶子。                                                |
| **R-HOST-4**   | `View` 下禁止裸文本；在 `createTextInstance` 或 `appendChild` 兜底 **抛错**。        |
| **R-HOST-5**   | 阶段一仅 `View`：任何触发 `createTextInstance` 的路径 **抛错**（与 R-HOST-4 一致）。 |
| **R-MULTI-1**  | V1 允许多个并列 `<Canvas>`；若将来出现宿主型 Canvas，须重新定义歧义嵌套策略。        |
| **R-PORTAL-1** | 未实现 Portal 前，跨根传送须 **明确失败**，禁止静默错渲染。                          |

---

## 2. 报错与警告策略

| 情形                                        | 建议                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| 违反 R-ROOT / R-HOST / R-PORTAL（未支持时） | **生产与开发均 `throw`**，固定错误前缀（如 `[react-canvas]`）+ 规则 ID 或简短说明。 |
| 弃用 API、可恢复的性能提示                  | 仅 **`__DEV__`** 下 `console.warn`。                                                |

---

## 3. 按「节点类型」的检测位置

### 3.1 `Canvas`（React 组件，非宿主 fiber）

- **R-ROOT-1**：在 `Canvas` 内读取 `CanvasProvider` Context（`yoga` / `canvasKit` / `isReady` 等）；**未就绪或未包裹时 `throw`**。
- **初始化顺序**：仅在 Provider 就绪后再 `createContainer` / `updateContainer`，避免半初始化状态。
- **R-ROOT-2**：宿主类型不通过「可被误用在 react-dom 里的假组件」导出；若必须导出包装组件，开发态可配合 **单 Reconciler 根** 设计，使非法用法自然无法挂载。

### 3.2 容器宿主（`View` 及后续块级宿主）

- **R-HOST-2**：在 **`createInstance(type, …)`** 中：若 `type` 为 `View`（或块级名单）且当前 **child host context** 标明 **insideText**，则 **`throw`**。
- **R-HOST-4 兜底**：在 **`appendChild(parent, child)`** / **`appendInitialChild`** 中：若 `parent` 为 `ViewNode` 且 `child` 为 **文本实例**，**`throw`**（防止仅靠 `createTextInstance` 顺序差异漏检）。

### 3.3 文字宿主（`Text`）

- **R-HOST-3**：`createInstance('Text', …)` 在 **insideText === true** 时 **允许**（嵌套 Text）。
- **R-HOST-2**：已由 3.2 在子级为 `View` 时拦截；块级名单随 `Image` 等扩展维护。

### 3.4 文本叶子（`createTextInstance`）

- **R-HOST-4 / R-HOST-5**：在 **`createTextInstance`** 中根据 **即将挂入的父宿主类型** 判断：若父为 **`ViewNode`**（且无 `Text` 包裹路径），**`throw`**。
- 若当前 `react-reconciler` 调用顺序下父引用未就绪，以 **`appendChild(ViewNode, textInstance)`** 为 **第二道闸**（与 3.2 合并实现）。

### 3.5 `getChildHostContext` / `getRootHostContext`

- **根 context**：例如 `{ insideText: false }`。
- **进入 `Text` 宿主后**：子代 context 设为 **`insideText: true`**，直到子树离开 `Text`（标准 Reconciler 沿 fiber 传递，与 Ink / RN 一致）。
- **`View` 下**：向子代传递 **`insideText: false`**（覆盖仅针对从 Text 子树回到 View 子树的路径，具体以 reconciler 回调语义为准）。

**校验只发生在 commit 路径的 HostConfig 中**，不在组件 render 函数体内修改场景树（见 [hostconfig-guide.md](./hostconfig-guide.md)）。

---

## 4. 检测点速查表

| 检测点                       | 条件（摘要）                | 行为                                   |
| ---------------------------- | --------------------------- | -------------------------------------- |
| `Canvas` mount / 首帧        | 无 Provider 或未就绪        | `throw`（R-ROOT-1）                    |
| `createInstance('View')`     | `insideText === true`       | `throw`（R-HOST-2）                    |
| `createInstance('Text')`     | 按产品可选限制根上直接 Text | 可选 `throw`                           |
| `createTextInstance`         | 父将挂到 `View`             | `throw`（R-HOST-4 / R-HOST-5）         |
| `appendChild(parent, child)` | `ViewNode` + 文本子实例     | `throw`（兜底）                        |
| Portal（未实现）             | 检测到跨容器传送            | `throw` 或 dev invariant（R-PORTAL-1） |

具体参数顺序以项目使用的 **`react-reconciler` 版本** 的类型定义为准。

---

## 5. 多 Canvas 与将来「Canvas 宿主」

- **R-MULTI-1**：并列多个 `<Canvas>` 各自独立 Reconciler 根与 Surface 即可。
- 若将来增加 **场景树内的 Canvas 宿主**：在对应 **`createInstance`** 中限制父类型，并更新 R-MULTI-1 条文与本文 4 节表格。

---

## 6. 测试建议

- **工具链**：用 **`vp test`** 执行；测试文件内从 **`vite-plus/test`** 导入 `test` / `expect` / `describe` 等（见 `AGENTS.md`），勿 `import from 'vitest'`。
- **单元测试**：直接调用 HostConfig（或抽出纯函数 `assertValidAppend(parent, child)`），断言 **抛出** 与 **错误文案** 含规则 ID 或固定前缀。
- **集成测试**：在 `CanvasProvider` 下用测试渲染器挂载 **非法 JSX**，断言 ErrorBoundary 或 **同步 throw**。
- **回归**：每新增宿主类型（如 `Image`）时更新 **块级名单** 与 R-HOST-2 测试用例。

---

## 7. 相关文档

- 规则来源与落地阶段：[development-roadmap.md](../development-roadmap.md) 文中 **「结构约束（须运行时强制）」** 一节
- Reconciler 调用顺序：[hostconfig-guide.md](./hostconfig-guide.md)
- 阶段一 HostConfig 表：[phase-1-design.md §3](./phase-1-design.md)
