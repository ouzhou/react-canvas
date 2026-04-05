# 多框架 UI 范式调研（Ant Design / shadcn/ui / Material UI / Radix UI / Base UI）

本文档从**交付形态、样式与主题、组件建模、无障碍与行为、开发与扩展**等维度对比常见方案，**仅做调研与事实归纳**，不包含 React Canvas 专属落地结论。项目侧设计见 [react-canvas-ui-design.md](./react-canvas-ui-design.md)。

---

## 1. 总览对比

### 1.1 完整样式组件库（antd / shadcn / MUI）

| 维度               | Ant Design（antd）                                                                                                                                                                                                                                                                                  | shadcn/ui                                                   | Material UI（MUI）                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **产品形态**       | npm 依赖的完整组件库                                                                                                                                                                                                                                                                                | CLI 将**源码**拷入项目，**自有代码**                        | npm 完整组件库                                                               |
| **样式技术**       | **antd 6**：默认 **`theme.zeroRuntime`**（见官方主题 API），通常配合 **全量/按需静态 CSS**（如 `antd/dist/antd.css`）或 **`@ant-design/static-style-extract`**；**SSR** 仍常用 **`@ant-design/cssinjs`**（`StyleProvider`、`extractStyle`）。可选 **`antd-style`**（`createStyles`）扩展 DOM 样式。 | **Tailwind CSS** + **CVA**（`class-variance-authority`）    | **Emotion** + **`sx`** / **`styled`**，输出面向 DOM 的 CSS                   |
| **主题**           | `ConfigProvider` + **Design Token**（`token` / `algorithm` / `components` 覆盖）                                                                                                                                                                                                                    | CSS 变量（如 `--background`）+ Tailwind 主题扩展            | `createTheme` + `ThemeProvider`，**palette** / **typography** / **shape** 等 |
| **交互与可访问性** | 组件内置 DOM 行为与 ARIA                                                                                                                                                                                                                                                                            | **Radix UI** 原语（焦点陷阱、键盘、语义）                   | 成熟的无障碍与键盘支持（DOM）                                                |
| **变体 API**       | `type` / `size` 等 props + 内部样式映射                                                                                                                                                                                                                                                             | **CVA**：`variants` / `compoundVariants` + `className` 合并 | `variant` / `color` + theme 覆盖或 `sx`                                      |
| **响应式**         | Grid 等用 DOM/CSS；token 可驱动                                                                                                                                                                                                                                                                     | Tailwind 断点（`sm:`、`md:`）                               | `sx` 内对象断点 `{ xs, sm, md }`                                             |
| **伪类 / 嵌套**    | CSS-in-JS 模板支持 `&:hover` 等                                                                                                                                                                                                                                                                     | Tailwind 状态变体与 `data-[state]`                          | `sx` 中 `'&:hover'`、嵌套选择器                                              |

### 1.2 无样式原语（Radix UI vs Base UI）

二者均为 **DOM 上**的 **headless / unstyled** 组件：负责 **WAI-ARIA、焦点、键盘、Portal、状态**，**不负责**视觉；外观由 className / CSS-in-JS / Tailwind 等你自选。

| 维度            | Radix UI（Primitives）                                            | Base UI（`@base-ui/react`）                                                                                                                                                                                    |
| --------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **定位**        | 低层可组合原语，强调无障碍与可定制                                | 无样式组件库，**Radix、Floating UI、MUI 团队背景**（官方描述），与 **MUI 体系**协同演进                                                                                                                        |
| **包与生态**    | `@radix-ui/react-*` 按原语分包；**shadcn/ui 的默认行为层**        | `@base-ui/react/*` 按组件分包；**独立于** `@mui/material`，可与任意样式方案搭配                                                                                                                                |
| **样式约定**    | **完全无默认样式**；常用 `data-state`、`data-disabled` 等配合 CSS | **完全由使用者上样式**；文档示例常见 `className`，可用任意 CSS 方案                                                                                                                                            |
| **API 风格**    | `Root` / `Trigger` / `Content` / `Portal` 等组合件                | **Compound components**（如 `Dialog.Root`、`Dialog.Portal`、`Accordion.Item`）；部分 API 支持 **`render` prop** 等扩展                                                                                         |
| **与 MUI 关系** | 无隶属；常被当作 **shadcn 底层**                                  | **与 Material UI 并行**：Material 管「带 Material 样式的成品」，Base UI 管「无样式原语」；**注意**：旧包名 **`@mui/base`** 与新一代 **Base UI** 迁移关系以 [MUI / Base UI 官方说明](https://base-ui.com/) 为准 |

---

## 2. Ant Design — 实现方式分域

### 2.1 交付与版本（与 antd 6 一致）

- **包安装**：`antd@6` 作为依赖；升级与破坏性变更以官方 **[从 v5 到 v6](https://ant.design/docs/react/migration-v6)** 为准。
- **默认样式路径（v6）**：`theme` 支持 **`zeroRuntime`**（自 **6.0.0** 起；官方主题配置中说明）。在 **零运行时** 模式下，组件样式依赖 **预置 CSS**（文档示例为 `import 'antd/dist/antd.css'`）或 **`@ant-design/static-style-extract`** 等 **静态抽取**；**不是**旧版「一律由运行时逐条注入」这一种形态。
- **SSR / 流式场景**：仍可使用 **`@ant-design/cssinjs`** 的 **`StyleProvider`**、`createCache`、**`extractStyle`**，在服务端把样式收集进 HTML（与 Next.js 等集成方式见官方 [SSR](https://ant.design/docs/react/server-side-rendering)、[use-with-next](https://ant.design/docs/react/use-with-next)）。
- **生态**：**`antd-style`** 仍在 Token 之上提供 **`createStyles`** 等，面向 **DOM** 的 `css` 模板与对象样式。

### 2.2 主题与 Token

- **`ConfigProvider`** 包裹应用，`theme` 中配置（**SeedToken / MapToken / AliasToken** 分层仍适用）：
  - **全局 `token`**：如 `colorPrimary`、`borderRadius`、`padding` 等。
  - **`algorithm`**：`defaultAlgorithm`、`darkAlgorithm`、`compactAlgorithm` 等（可数组组合），统一推导语义色与密度。
  - **按组件覆盖**：`components: { Button: { ... } }`；组件级还可控制是否沿用全局 `algorithm`（见官方 **Theme Configuration API**）。
  - **其它主题字段**：如 **`cssVar`**（CSS 变量前缀等）、**`inherit`**、**`hashed`**、**`zeroRuntime`** — 以当前 **[自定义主题](https://ant.design/docs/react/customize-theme)** 为准。
- 消费 token：**`theme.useToken()`**（hook）与静态 **`getDesignToken(config)`**，用于自定义组件或内联样式。

### 2.3 组件侧样式

- **v6**：多数场景下样式以 **静态/预置 CSS + 类名** 为主；组件对外仍常见 **`style`**、**`className`**，并广泛支持语义化的 **`styles`** / **`classNames`**（细粒度到 `root`、`icon` 等，可与 **Tailwind 类** 组合，见官方博客与组件文档）。
- 自定义扩展仍常见：通过 **`ConfigProvider` `theme`**、**`cssVar`** 或 **`getPrefixCls`** 做前缀与主题扩展。

---

## 3. shadcn/ui — 实现方式分域

### 3.1 交付与 CLI

- **不是传统 npm 大库**：`npx shadcn@latest init` 生成 **`components.json`**（风格、基础色、Tailwind 路径、别名等）。
- **`npx shadcn@latest add <component>`** 将组件 **源码** 拉入仓库，开发者完全拥有修改权。
- 定位：**可组合、可定制的设计系统起点**，而非黑盒依赖。

### 3.2 技术栈

- **Radix UI**：无样式原语（Dialog、Dropdown、Slot 等），负责 **可访问性、焦点、键盘与 WAI-ARIA**（分域说明见 **§5**）。
- **Tailwind CSS**：全部外观用 **utility class** 描述；**`cn()`**（通常 `clsx` + `tailwind-merge`）合并 class。
- **CVA（class-variance-authority）**：`variants`、`defaultVariants`、`compoundVariants`，用 **字符串 class** 表达组件变体（如 Sheet 的 `side: top | bottom | left | right`）。

### 3.3 主题

- 常用 **CSS 变量**（如 `bg-background`、`text-foreground`）+ Tailwind 配置，暗色通过 **`.dark` 类或变量切换**。

---

## 4. Material UI（MUI）— 实现方式分域

### 4.1 交付与引擎

- **`@mui/material`**：大量现成组件；样式通过 **Emotion**（默认）或可选 **styled-components**。
- **`@mui/system`**：**`sx` prop**、**`Box`** 等，强调 **主题感知** 的 CSS 对象。

### 4.2 主题

- **`createTheme`**：**`palette`**（primary/secondary/error、mode）、**`typography`**、**`shape`**、**`shadows`**、**`breakpoints`**、**`zIndex`** 等。
- **`ThemeProvider`** 注入；**`useTheme()`** 在组件内读取。
- 支持 **TypeScript 模块扩充**（`declare module` 扩展 `Theme`），保证 **`sx` 回调**里自定义字段类型安全。

### 4.3 `sx` 与变体

- **`sx`** 接受对象、数组或 **`(theme) => object`**；支持：
  - **主题路径字符串**（如 `'primary.main'`）、**spacing 简写**（`p`、`mt`）、**断点对象**、**伪类键**（`'&:hover'`）、**嵌套子选择器**。
- 本质：**编译为 CSS**，作用于 **DOM**。

---

## 5. Radix UI — 实现方式分域

### 5.1 定位

- **Radix Primitives**：面向 **Web DOM** 的 **无样式** 组件集合（Dialog、Dropdown Menu、Scroll Area、Tabs 等）。
- 设计目标：把 **无障碍（WAI-ARIA）、焦点管理、键盘交互、Portal** 等难做对的逻辑封装好，**样式 100% 交给调用方**。

### 5.2 样式与状态

- 官方明确：**可与任意样式方案配合**（CSS Modules、Tailwind、styled-components 等）。
- 有状态组件常暴露 **`data-state`**（如 `open` / `closed`）等，便于用 **属性选择器** 或 Tailwind 的 `data-[state=open]:` 写外观。
- 典型用法：**`asChild`**（与 Slot 组合）把行为合并到自有元素上（shadcn 里常见）。

---

## 6. Base UI（`@base-ui/react`）— 实现方式分域

### 6.1 定位

- **Base UI** 是 **无样式、可组合** 的 React 组件库，官方描述为 **Radix、Floating UI、Material UI 相关团队**协作产物，用于搭建 **可访问** 且 **样式完全自控** 的界面。
- 包名通常为 **`@base-ui/react/<component>`**（如 `dialog`、`accordion`、`popover`）；API 采用 **Compound components**（`Root`、`Trigger`、`Portal`、`Popup`、`Positioner` 等）。
- 与 **Material UI（`@mui/material`）** 关系：**并行产品** — MUI 提供带 Material Design 的成品；Base UI 提供 **headless 原语**。旧版 **`@mui/base`** 与新一代 Base UI 的迁移请以官网为准。

### 6.2 样式与扩展

- **不内置主题皮肤**：视觉由 **className**、CSS Modules、Tailwind、CSS-in-JS 等任意方式完成。
- 部分组件支持 **`render` prop** 等，便于替换默认元素或注入布局。
- **Floating UI** 与定位、层叠相关能力常融入 **Popover / Menu** 等（与「仅 Radix」栈相比，定位策略可能更统一，具体以组件文档为准）。

---

## 7. 各方案设计特点精粹（对照）

| 来源           | 代表性设计点                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| **Ant Design** | **Design Token + ConfigProvider 层级**；**useToken**；暗色算法；**按组件覆盖主题**。                      |
| **shadcn/ui**  | **开放代码所有权**；**CVA 级变体建模**；**cn/合并**类名。                                                 |
| **MUI**        | **主题对象结构**（palette、spacing、shape）；**`sx` 式的函数主题与数组合并**；**TypeScript 扩展 Theme**。 |
| **Radix UI**   | **无障碍与行为**与 **样式**分离；**`data-state`**；**asChild**；DOM 层行为原语。                          |
| **Base UI**    | **Headless + Compound** 与 MUI **并行**；**Floating UI** 系定位；**无样式原语**的官方路径之一。           |

---

## 8. 相关文档

| 文档                                                        | 说明                                                                |
| ----------------------------------------------------------- | ------------------------------------------------------------------- |
| [react-canvas-ui-design.md](./react-canvas-ui-design.md)    | 基于本调研与 `@react-canvas/react` 的 **@react-canvas/ui** 设计结论 |
| [known-limitations.md](../known-limitations.md)             | React Canvas 平台能力边界                                           |
| [development-roadmap.md](../development-roadmap.md)         | 路线图（含 StyleSheet、可选 Tailwind 等）                           |
| [core/technical-research.md](../core/technical-research.md) | RN 样式与对标系统                                                   |

---

## 9. 参考与延伸阅读（官方）

- Ant Design：[自定义主题](https://ant.design/docs/react/customize-theme)（Design Token、`zeroRuntime` 等）、[v6 迁移](https://ant.design/docs/react/migration-v6)、[`@ant-design/cssinjs` SSR](https://ant.design/docs/react/server-side-rendering)
- [shadcn/ui](https://ui.shadcn.com/)：Open Code、CLI、Radix + Tailwind
- Material UI：`sx` prop、Theming、`createTheme`（[MUI 文档](https://mui.com/)）
- [Radix UI Primitives](https://www.radix-ui.com/primitives)：无障碍、Styling 指南、`data-state`
- [Base UI](https://base-ui.com/)：`@base-ui/react`、与 MUI 关系、迁移说明（含旧 `@mui/base`）

本文档为架构选型说明，**不**绑定具体 npm 版本；实现时以各官方当前 API 为准。
