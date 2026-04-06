# 教程（Core TS + React）第一波 — 设计规格

**日期：** 2026-04-07  
**状态：** 已定稿（与对话结论一致，待实现）  
**范围：** `apps/website` 内 **用户向教程正文**（选项 **A**：按路线图补全 **Core + React**，**Tabs** 同构、链 **Playground**、摘要链 **`docs/`** 专文）；**不**包含 `@react-canvas/ui` 逐组件深文档（另线）、**不**改变运行时包 API。

**依赖规格：** [2026-04-06-docs-website-redesign-design.md](./2026-04-06-docs-website-redesign-design.md)（IA 与撰写约定）、[2026-04-07-docs-authoring-context7-starlight.md](./2026-04-07-docs-authoring-context7-starlight.md)（内置组件须先 Context7）。

---

## 1. 目标与非目标

### 1.1 目标

- 按 **[development-roadmap.md](../../development-roadmap.md)** 里程碑 **M1→M4** 顺序，提供 **可读、可跟做** 的教程章节：运行时与布局绘制 → 文字 → 指针与事件 → 图片与 SvgPath。
- **同一主题**优先 **单页 MDX**，内用 **`Tabs`（TS | React）** 并列最小示例；与既有规格一致。
- 每章 **显式链接** 对应 **Playground** 与仓库 **`docs/`** 专文（摘要 + GitHub `blob/main` 链接，仓库：`https://github.com/ouzhou/react-canvas`）。
- 使用 Starlight 内置组件前遵守 **Context7 + `/withastro/starlight`** 约定。

### 1.2 非目标

- 不替代 **`docs/`** 中长文设计规格；站内保持精简。
- 不要求第一波写满所有边界情况与 API 面；以「能跑通 + 关键类型/函数」为主，后续迭代补全。
- 不在此任务中新增或修改 **playground** 内 React 示例代码（仅文档互链）。

---

## 2. 信息架构：文件与侧栏

为避免 **同一 slug 在 Core / React 两组重复**，第一波 **统一放在 `guides/`**（与 Starlight 常见「指南」语义一致），侧栏新增分组 **「教程」**（或 **「指南」**，实现时二选一，全站统一命名）。

| 顺序 | 页面         | 文件路径（建议）            | Starlight slug          | 路线图对应     | Playground                      |
| ---- | ------------ | --------------------------- | ----------------------- | -------------- | ------------------------------- |
| 1    | 快速上手     | `intro/quickstart.mdx`      | `intro/quickstart`      | 入门 / M1 入口 | [phase-1](/playground/phase-1/) |
| 2    | 运行时与布局 | `guides/runtime-layout.mdx` | `guides/runtime-layout` | 阶段一         | phase-1                         |
| 3    | 文字         | `guides/text.mdx`           | `guides/text`           | 阶段二         | text                            |
| 4    | 指针与事件   | `guides/pointer.mdx`        | `guides/pointer`        | 阶段三         | pointer                         |
| 5    | 图片与 SVG   | `guides/image-svg.mdx`      | `guides/image-svg`      | 阶段四 Step 8  | image-svg                       |

**不再提供** 独立路由 **`/core/`**、**`/react/`** 概览页：Core 与 React 入口统一为 **`/guides/*`** 教程（单页 **Tabs**）及首页 / 入门链接。

**侧栏：** 在 `astro.config.mjs` 的 `starlight.sidebar` 中 **入门** 组内含 **`intro/quickstart`**；**教程** 分组 `items` 为上表 `guides/*` 五条；**不包含** 单独的 Core / React 分组。

---

## 3. 单章结构与组件

1. **Frontmatter**：`title`、`description`；篇首 1～3 句对应 roadmap **阶段 / 里程碑**。
2. **正文**：概念 → **`Tabs`**（`TabItem`：Core（TS）/ React）最小示例 → 注意点与 **运行时结构** 链到 [reference/constraints](/reference/constraints/) 或专文 → **Playground** → **`docs/`** 延伸阅读。
3. **内置组件**：按 [2026-04-07-docs-authoring-context7-starlight.md](./2026-04-07-docs-authoring-context7-starlight.md)，撰写前 **Context7** 查 **`/withastro/starlight`**（`Tabs`、`TabItem`、`Card`、`Steps` 等），**禁止**自造等价通用组件。

**代码示例原则：** 教程中的代码块以 **说明性** 为主，须与当前 **`@react-canvas/core` / `@react-canvas/react` 导出**一致；若与实现有出入，以 **包源码与类型** 为准并更新文档。

---

## 4. 与仓库 `docs/` 的互链（建议映射）

| 教程主题     | 建议链至的专文（blob URL）                                                          |
| ------------ | ----------------------------------------------------------------------------------- |
| 运行时与布局 | `docs/react/phase-1-design.md`                                                      |
| 文字         | `docs/react/react-yoga-text-nodes.md`（及 roadmap 阶段二相关）                      |
| 指针与事件   | `docs/react/` 下阶段三交互专文（若存在）；`runtime-structure-constraints.md` 作补充 |
| 图片与 SVG   | `docs/superpowers/specs/` 中阶段四 Image/SvgPath 规格或 roadmap 对应节              |

具体段落由实现时在 MDX 中写入稳定 GitHub 链接。

---

## 5. 验收标准

- 上表 **6 个** MDX 页面（含 `intro/quickstart`）均可从侧栏到达，`vp exec astro build`（于 `apps/website`）通过。
- 每篇 **`guides/*`** 含 **Tabs** TS/React 或明确说明为何某一侧暂缓。
- 每篇至少 **一处** 指向对应 **Playground**。
- **Context7** 约定在 `intro/authoring.mdx` 与专文 [2026-04-07-docs-authoring-context7-starlight.md](./2026-04-07-docs-authoring-context7-starlight.md) 已存在，实现时遵守。

---

## 6. 后续步骤

- 实现：见 **`docs/superpowers/plans/2026-04-07-docs-tutorials-core-react-phase-a-implementation.md`**（writing-plans 产出）。
