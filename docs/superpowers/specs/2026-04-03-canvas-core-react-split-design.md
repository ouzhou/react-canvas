# Canvas 双包架构：Core（Yoga + 样式）与 React 绑定

日期：2026-04-03  
状态：草案（待你审阅后进入 implementation plan）

## 1. 目标与成功标准

- **目标**：用 **React 组件**在单个（或多个）canvas 上绘制；布局由 **Yoga** 完成；样式以 **可映射到 Yoga + 绘制的 CSS 子集**表达（而非完整浏览器 CSS 引擎）。
- **路径**：先实现 **不依赖 React 的 core 命令式 API**（下文「类 API」指可实例化/可组合的对象模型，不必限定 ECMAScript `class` 关键字），再在其上封装 **React reconciler**。
- **交付形态**：两个 npm 包，**纯 JS/TS 项目只依赖 core**，**React 项目依赖 react 包（并间接依赖 core）**。

**成功标准（v1 可验收）**

- Core：能在浏览器中用命令式 API 创建一棵树，跑一次 Yoga layout，将结果绘制到 `CanvasRenderingContext2D`。
- Core：支持一小套与 Yoga 对齐的样式/布局字段（见第 4 节），以及至少一种填充类绘制属性（如背景色）。
- React：`render(<…>, canvas)`（或等价 API）产生的树与 core 行为一致；DOM 侧可有 ref/Stage 组件，但不强制与 Ink 完全一致。
- 测试：core 布局与绘制有关键单测（可在 Node 用离屏/ mock context，或浏览器环境）；react 包保留/补充 reconciler 级烟测。

## 2. 方案回顾与选定结论

| 方案 | 说明                                                 | 结论                                                             |
| ---- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| A    | 仅维护单一 React 包，Yoga/样式全绑在 reconciler 内   | 拒绝：无法满足「普通 JS 项目」与「先 core 后 React」             |
| B    | Core = 场景图 + Yoga + 样式 + 绘制；React = 薄适配层 | **选定**                                                         |
| C    | 直接依赖 Konva/React Konva 做产品与布局              | 拒绝：与本仓库「自研 + Yoga + CSS 子集」目标不一致；可作文档对照 |

**推荐（已采纳）**：**B**。与 [React Konva](https://github.com/konvajs/react-konva) 类似都是「宿主无关内核 + React reconciler」，但本项目的内核是 **Yoga + 自绘 2D**，而不是 Konva 场景图。

## 3. 架构与职责划分

### 3.1 `@ouzhou/canvas-core`（名称可微调，职责不变）

- **场景树**：父节点、子节点、有序 children；每个节点持有 **layout 盒**（Yoga node）与 **绘制属性**。
- **布局**：创建/更新 Yoga 树；将「样式中的布局字段」同步到 Yoga；`calculateLayout`；读回 frame（x/y/width/height）供绘制。
- **绘制**：对树做深度优先（或按层）遍历，用 `CanvasRenderingContext2D` 绘制矩形等基础图元；后续可扩展文本、图片。
- **对外 API**：无 `react` 依赖；可导出工厂函数或类（如 `createRoot(canvas)`、`Node`、`View` 等命名与现有代码对齐时再定）。
- **资源**：浏览器端 Yoga 通常通过 **`yoga-layout`（WASM）** 等方案加载；需在 spec 层承认 **异步初始化**（例如 `await initYoga()`）或同步打包策略二选一，在实现计划中敲定。

### 3.2 `@ouzhou/react-canvas`（由当前单包演进）

- **只做**：把 React 元素类型/props/children 映射为 core 树更新；管理 `react-reconciler` 容器与 `updateContainer`；暴露 `View` 等宿主组件类型与 `render`。
- **依赖**：`peerDependencies`：`react`；`dependencies`：`@ouzhou/canvas-core`、`react-reconciler`、`scheduler`（与现有一致）。
- **不包含**：Yoga 细节、具体 `fillRect` 逻辑（除非调试桥）。

### 3.3 数据流（概念）

```
React tree  →  reconciler  →  core 场景图更新  →  Yoga layout  →  paint(canvas)
     ↑______________________________________________|  state/props 更新
```

## 4. 「CSS 样式」范围（v1 诚实子集）

完整 CSS 不在范围内。v1 约定三类字段（均可先以 **plain object** 表达，与 React `style` prop 对齐）：

1. **布局（进 Yoga）**：如 `width`、`height`、`minWidth`、`flexGrow`、`flexDirection`、`padding*`、`margin*`、`justifyContent`、`alignItems` 等——以 Yoga 支持集合为准，文档列出白名单。
2. **绘制（不进 Yoga）**：如 `backgroundColor`、后续 `border*`、`opacity` 等——在 layout 后的 box 上绘制。
3. **显式非目标（v1）**：选择器引擎、`!important`、继承级联、单位全集、`float`、`grid`（非 Yoga）、任意 HTML。

若未来需要「类名」：应在 core 或上层引入 **小型样式表映射**（class → style object），仍不实现完整 CSS。

## 5. Monorepo 结构

- `packages/canvas-core` → 发布名 **`@ouzhou/canvas-core`**（若更喜 `@ouzhou/core` 可改名，但与生态冲突概率高，建议保留 `canvas-core`）。
- `packages/react-canvas` → 保留 **`@ouzhou/react-canvas`**，依赖 workspace 内的 `canvas-core`。
- `apps/website`：演示 **React** 用法；可选增加一个 **tiny vanilla** 示例（同一 app 内第二页或 `examples/vanilla`）验证 core 独立可用——实现计划阶段再定，非 v1 阻塞。

## 6. 错误处理与边界

- Canvas 无 2D context：与现有一致，抛明确错误。
- Yoga 未初始化完成即 layout：core API 应要么 `await` 就绪，要么 `createRoot` 返回前完成初始化，避免半初始化树。
- 尺寸：继续区分 **CSS 像素**与 **backing store**（devicePixelRatio），由 core 在 attach canvas 时统一处理，React 层只传逻辑尺寸或跟随 canvas 属性。

## 7. 测试策略

- **canvas-core**：纯函数/树 diff、Yoga 输入输出（给定 style → 期望 frame）、绘制调用序列（mock `ctx`）。
- **react-canvas**：现有测试风格延续；必要时对「props 更新 → core 树更新」做集成测。

## 8. 与当前代码库的关系

- 现有 `packages/react-canvas` 中的 **reconciler-config、paint、canvas-size** 等，迁移时以 **「下沉到 core」 vs 「留在 react 层」** 按第 3 节划分；目标状态是 **大部分布局与绘制在 core**。
- **破坏性变更**：对外从「单包」变为两包；网站与文档需更新 import 路径；版本号策略在实现计划中说明（如 0.x 并行迁移）。

## 9. 范围控制（YAGNI）

- v1 不要求：多 root 并发、离屏 Worker 渲染、完整事件命中测试、与 Konva 互操作。
- v1 要求：**一条清晰的 core API + 一条 React API**，且 Yoga + 样式子集可演示。

---

## Spec 自检（2026-04-03）

- **占位符**：无 TBD；WASM 初始化策略在 §3.1 标为实现计划待定，属有意留白。
- **一致性**：Core/React 职责与数据流一致；CSS 定义为子集，与 Yoga 不矛盾。
- **范围**：单 spec 覆盖双包与 v1 验收，可拆实现计划为「core 先行 → react 适配」两阶段。
- **歧义**：「class 功能」已按 **命令式对象 API** 理解；若你指 **CSS class 选择器**，需追加一节「v2 样式表」——当前 spec 将 CSS class 列为非 v1（见 §4 末）。
