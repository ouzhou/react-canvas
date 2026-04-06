# Canvas 运行时与多 `CanvasProvider` — 设计规格

**日期：** 2026-04-09  
**状态：** 已实现（core 订阅式初始化 + React `useSyncExternalStore`；见实现计划与同提交代码）  
**关联：** `@react-canvas/core`（`initCanvasRuntime`）、`@react-canvas/react`（`CanvasProvider`、`CanvasRuntimeContext`）、文档站 `playground/multi-canvas`

---

## 1. 背景与问题陈述

- 同一页面可能出现 **多个** `<CanvasProvider>`（嵌套路由、并排 demo、第三方组件、文档站多段 client island 等）。**库不应、也无法**强制「一页仅一个 Provider」。
- **Yoga / CanvasKit（WASM）** 在浏览器单 JS 环境中应 **只初始化一次** 并复用；并发重复初始化易导致竞态与部分失败。当前 `packages/core` 已通过模块级单例 Promise 缓解。
- **默认段落字体**加载另有单飞逻辑，但若多个 Provider 传入 **不一致的** `runtimeOptions`，需要 **可文档化、可测试** 的语义，避免「隐式碰巧能跑」。
- **多块 `<canvas>`** 仍可能受 **WebGL 上下文数量**等浏览器限制影响；这与 **Provider 个数** 无简单一一对应，须在文档中与 WASM 初始化问题区分。

---

## 2. 目标与非目标

### 2.1 目标

1. **对外契约**：明确支持 **多个 `CanvasProvider` 同页共存**；说明 **WASM 单例** 与 **React Context 树** 的关系；区分 **运行时初始化** 与 **每块画布的 WebGL 资源**。
2. **`runtimeOptions` 语义**：当多个 Provider 的选项 **冲突** 时，定义 **唯一、简单** 的规则（见 §4），并在开发模式下可选 **一次性警告**。
3. **实现架构（可大改）**：在 **合理边界** 内重构 `CanvasProvider` 与（可选）`core` 暴露的订阅/查询接口，使「订阅 `initCanvasRuntime` → 就绪/错误」**逻辑集中**，减少重复 `useEffect` 与状态分叉，便于测试与演进。
4. **文档与 Playground**：弱化「必须一个 Provider」的误读；保留 **「单 Provider + 多 Canvas」** 作为 **性能/结构上的可选建议**（尤其与多 WebGL 上下文相关）。

### 2.2 非目标

- **不**承诺绕过浏览器 **WebGL 上下文上限**（仅说明与排查路径）。
- **不**将「应用入口必须先 `preload`」作为 **唯一**合法用法（可作为 **可选** API 补充，见 §5.3）。
- **不**在本规格内解决「同一页面两套互不兼容的 CanvasKit 配置」——标为 **罕见**；若未来需要，另开规格。

---

## 3. 对外契约（库承诺）

### 3.1 多 Provider

- **支持**：同一文档树内 **任意数量** 的 `<CanvasProvider>`，只要各自子树内 `useCanvasRuntime()` / `<Canvas>` 的祖先链上有 **至少一个已成功就绪** 的 Provider。
- **底层运行时**：**Yoga** 与 **CanvasKit** 实例在进程内 **单例复用**（与当前 `initCanvasRuntime` 设计一致）。
- **React Context**：每个 `CanvasProvider` 仍提供 **独立的** `CanvasRuntimeContext.Provider` 边界；**值**在就绪后指向 **同一** `yoga` / `canvasKit` 引用（与单例一致）。

### 3.2 可选实践（非强制）

- **单 Provider + 多个 `<Canvas>`**：在需要同屏大量画布时，可减少重复订阅与心智负担，并便于对照 **WebGL 上下文**占用；**非 API 约束**。

### 3.3 与浏览器限制的关系

- **多块 `<canvas>`** 可能各自创建 **WebGL 上下文**；数量过多时可能出现空白或失败。该问题 **不能** 用「减少 Provider 个数」单独解决，需结合 **画布数量、合并渲染策略** 等排查。

---

## 4. `runtimeOptions` 冲突语义（规范）

以下称 **`InitCanvasRuntimeOptions`** 中与 **默认段落字体**相关的两项为 **字体选项**：`loadDefaultParagraphFonts`、`defaultParagraphFontUrl`。

### 4.1 规则（首版推荐）：**首次成功初始化为准**

- 在 **同一 JS 环境**内，对 **`initCanvasRuntime` 的首次成功完成**（含字体阶段按该次调用选项执行）所依据的 **字体选项** 视为 **生效选项**。
- **后续**再次调用 `initCanvasRuntime` 且 **字体选项与生效选项不一致** 时：
  - **不**据此重新发起冲突的字体加载以「纠正」先前行为；
  - **不**抛错（避免在已可渲染的页面上因后挂载 Provider 而崩溃）；
  - **可选**：在 **`development`** 下 **`console.warn` 一次**（带可识别前缀，如 `[react-canvas]`），便于发现配置错误。

### 4.2 实现注记

- **Yoga / CanvasKit** 始终单例；**字体**加载已有单飞；本规则是在 **产品语义** 上承认「多 Provider 可能传入不同字体选项」，并 **显式定义** 合并策略，避免依赖未定义顺序。
- 若未来需要 **严格按 Provider 隔离字体**（极少见），需 **新规格** 并可能引入 **显式 runtime id**，**不在**本首版范围。

---

## 5. 架构方案（允许大改）

### 5.1 原则

- **边界清晰**：`@react-canvas/core` 负责 **无 React** 的初始化与单例；`@react-canvas/react` 负责 **订阅就绪状态** 与 **Context 注入**。
- **可测试**：多 Provider 挂载、选项冲突警告、就绪/错误传播路径可单测（沿用现有 WASM 测试超时策略）。

### 5.2 推荐方向 A（优先）：Core 暴露「可共享的初始化句柄」，React 薄封装

在 **core** 中增加（命名待定）：

- **`getCanvasRuntimeInit(options?)`**：返回 **稳定** 的 `{ promise, getStatus }` 或 **`subscribe(listener)`**，使 **同一组选项**（或全局唯一键）对应 **同一** 条初始化管线，避免多处重复拼装 `Promise` 逻辑。
- 或将 **`initCanvasRuntime`** 保持为面向调用方的 `Promise` API，但新增 **`subscribeCanvasRuntime(options, cb)`** / **`useCanvasRuntimeInit` 的非 React 测试桩** 等，**仅供** `react` 包与测试使用。

**React 侧**：

- `CanvasProvider` 使用 **`useSyncExternalStore`**（或等效）订阅 **core 导出的就绪快照**（`idle` / `loading` / `ready` / `error`），再写入 **本地 Context**。
- **公开 API** 尽量保持：**`CanvasProvider` + render props** 不变；若需新增 **可选** `preload` 再讨论（§5.3）。

**优点**：单源真相、与 React 18 并发模型友好、便于 Strict Mode 下验证「取消」语义（与 `cancelled` 标志对齐）。

### 5.3 可选方向 B：显式 `preloadCanvasRuntime(options?)`

- 作为 **可选** 导出，供应用在 **路由入口** 或 **懒加载边界** 主动 `await`，减少首屏多块同时挂载时的并发抖动。
- **不得**成为唯一路径；无 preload 时行为与现在一致。

### 5.4 不推荐作为主方案

- **仅**文档不改代码：不足以达成「架构合理」与可维护的冲突语义。
- **仅 React 内用模块级 `let` 镜像状态、不调整 core**：可短期减负，但 **选项冲突** 与 **测试桩** 仍分散，长期不如 core 层显式句柄清晰。

---

## 6. 测试策略

- **多 Provider**：同页渲染两个 `CanvasProvider`，断言 **均就绪** 且 **Context 中 `yoga`/`canvasKit` 引用一致**（引用相等）。
- **选项冲突**：先挂载 A（例如 `loadDefaultParagraphFonts: true`），再挂载 B（`false`），断言 **不抛错**，且 **开发环境** 下 **至多一次** warn（若实现）。
- **错误传播**：初始化失败时，各 Provider 子树收到的 `error` 行为符合快照（与现有一致或在本规格中明确变更点）。

---

## 7. 文档与站点

- **`playground/multi-canvas`** 与 **`multi-canvas.mdx`**：将措辞改为 **建议** 而非 **必须**；保留 A/B 对照用于 **WASM 与 WebGL** 教育意义。
- **指南页**（如 `runtime-layout` 或 `quickstart`）：增加简短 **「多 Provider」** 小节，链到本规格。

---

## 8. 迁移与破坏性变更

- **默认目标**：**不破坏** 现有公开 API；若必须调整类型或导出，在实现计划中列出 **迁移说明** 与 **次要版本**策略。
- **内部大改**：允许 `packages/react` 与 `packages/core` **内部模块**重组，只要对外行为符合本规格。

---

## 9. 自检（规格成稿）

- [x] 无占位「TBD」阻塞项；未决细节留在实现计划（如确切函数名）。
- [x] 契约（§3）与冲突规则（§4）一致；与「单 Provider 建议」（§3.2）不矛盾。
- [x] 范围可收敛为实现计划；超大特性（多 CanvasKit 配置）已排除。

---

## 10. 审阅后下一步

审阅通过后，使用 **writing-plans** 技能撰写实现计划（分 core / react / docs / tests 任务顺序与验收标准）。
