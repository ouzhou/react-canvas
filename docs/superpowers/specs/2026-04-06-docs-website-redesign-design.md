# 文档网站（Starlight）信息架构与主题 — 设计规格

**日期：** 2026-04-06  
**状态：** 已定稿（与对话结论一致，待实现）  
**范围：** **`apps/website`** 内基于 **Astro + `@astrojs/starlight`** 的**文档站**结构、撰写约定与全站主题策略；**不**包含画布运行时新功能实现，**不**将 `@react-canvas/ui` 的组件样式等同于文档站壳层样式（壳层仅服务阅读文档的 HTML/CSS）。

**参考：** [development-roadmap.md](../../development-roadmap.md)；Starlight 官方文档（侧栏、`customCss`、Tailwind 集成、MDX 组件）以 Context7 `/withastro/starlight` 与 [starlight.astro.build](https://starlight.astro.build/) 为准。

---

## 1. 目标与非目标

### 1.1 目标

- 按 **[development-roadmap.md](../../development-roadmap.md)** 的能力阶段组织读者路径，并与三种内容类型对齐：**① 原生 TS + `@react-canvas/core`**、**② React 用法（与 ① 同构的文档案例）**、**③ `@react-canvas/ui` 组件库（逐组件详解）**。
- **文档站侧**统一使用 Starlight 内置组件（如 `Card`、`Steps`、`Tabs` 等）与 **全站主题**：以 **`@astrojs/starlight-tailwind`** 为主、`customCss` 为辅（见第 4 节）。
- 侧栏与 `src/content/docs/` 目录结构可维护、可扩展：新增 roadmap 阶段或新组件时，有明确落点。

### 1.2 非目标

- **不**在本规格中规定画布内 UI 的视觉稿；画布示例代码仍写在对应文档与 playground 中，与「站点壳」分层。
- **不**强制一次性迁完所有正文：允许分阶段把现有 playground 与仓库 `docs/` 中的材料迁入 Starlight；实现顺序见后续 **writing-plans** 产出的实现计划。
- **不**改变 monorepo 内 **`docs/`** 作为设计与调研长文的定位（见第 5 节）；网站以**用户向教程与 API 导航**为主，可与 `docs/` 互链。

---

## 2. 信息架构（侧栏顶层）

下列分组为已定稿（顺序可在实现时微调）。**修订说明（2026-04-07）：** 不再使用独立 **`/core`**、**`/react`** 侧栏分区；**类型 ① / ②** 的教程统一落在 **`guides/`**，单页用 **`Tabs`（TS | React）**（见 [2026-04-07-docs-tutorials-core-react-phase-a-design.md](./2026-04-07-docs-tutorials-core-react-phase-a-design.md)）。

| 分组            | 含义                                                                                | 与 roadmap / 内容类型                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **入门**        | 项目简介、安装、快速上手、路线图导读、撰写指南（摘要 + 链至 `development-roadmap`） | 全局                                                                                                                  |
| **教程**        | **`guides/`**：按阶段的可跟做章节；**Tabs** 并列 Core（TS）与 React                 | 路线图 M1→M4 等；内容类型 **① + ②** 同页呈现                                                                          |
| **UI 组件库**   | `@react-canvas/ui`：主题、各导出组件                                                | 路线图并行演进部分；内容类型 **③**，**一组件一章（或 autogenerate 目录下一页一项）**                                  |
| **Playground**  | 在线交互示例                                                                        | 与教程互链                                                                                                            |
| **参考 / 附录** | API 索引、运行时结构约束（R-\*）、术语、外链至仓库专文                              | `autogenerate` 或手写索引；与 [runtime-structure-constraints.md](../../react/runtime-structure-constraints.md) 等互链 |

**Core 与 React 的「同构」约定：** 同一能力在 **`guides/`** 单页内用 **`Tabs`** 呈现「TS | React」；一般不再拆成 **`/core/*`** 与 **`/react/*`** 两套路由。  
**UI 组件库** 单页建议结构：**依赖与主题 → 最小示例 → 变体 / API 表**（可用 **`Steps`** 引导流程）。

---

## 3. 文档撰写与 Starlight 组件约定（站点侧）

以下为**默认作者指南**（新页面应遵守，除非有理由偏离）。

1. **Frontmatter**：至少 `title`、`description`；需要时在 frontmatter 或侧栏配置中使用 `sidebar.label` / `sidebar.badge`（如「实验中」「随 roadmap 更新」）。
2. **篇首**：用 1～3 句说明本节对应的 **roadmap 阶段/能力**。
3. **正文顺序**：概念 → 示例 → 注意点 / 限制。

| 组件（`@astrojs/starlight/components`） | 建议用途                                                          |
| --------------------------------------- | ----------------------------------------------------------------- |
| **`Steps`**                             | 安装、初始化、从零跑通流程                                        |
| **`Tabs`**                              | 同一能力下 **Core（TS）与 React** 并列，或「说明 / 完整示例」切换 |
| **`Card`**                              | 单条提示、延伸阅读、与正文区分的旁注；跨页导航                    |
| **卡片网格 / 链接型卡片**（若使用）     | 入门或索引页，指向 Core / React / UI 分区                         |
| **`Badge`**                             | 侧栏或文内状态标记                                                |
| **代码块**                              | 默认 fenced；避免无必要地嵌套多层 `Tabs`/`Steps`                  |

---

## 4. 全站主题与样式策略

- **主路径：** 采用 Starlight 官方 **Tailwind** 集成（`@astrojs/starlight-tailwind`），在全局样式中使用 `@theme` 等机制覆盖 **字体栈、accent、gray**，与官方文档一致，便于长期维护品牌色与排版。
- **辅路径：** 保留少量 **`customCss`**（在 `starlight({ customCss: [...] })` 中注册），仅用于：`--sl-*` 微调、内容最大宽度、或与 Tailwind 无关的少量覆盖；避免「一半令牌在 Tailwind、一半手写」却未文档化。

**分层说明：** 文档站壳上的「按钮 / 链接 / 排版」仅指 **Starlight 渲染的 HTML**；**画布内** `@react-canvas/ui` 的 Button 等仍在 **UI 组件文档与示例代码** 中说明，不记入本节站点主题。

---

## 5. `src/content/docs/` 目录结构（目标草案）

实现时可按下列**逻辑目录**组织文件，侧栏在 `astro.config.mjs` 的 `starlight.sidebar` 中与之一致（可用 `autogenerate` 减少手工维护）。

```text
apps/website/src/content/docs/
  index.mdx                    # 首页/欢迎

  intro/                       # 入门
    installation.mdx
    roadmap.mdx                # 路线图导读（链至仓库 development-roadmap）
    quickstart.mdx             # 快速上手

  guides/                      # 教程（Tabs：Core TS | React）
    runtime-layout.mdx
    ...

  ui/                          # @react-canvas/ui（类型 ③）
    ...                        # 每组件一文件，或子目录 + autogenerate

  reference/                   # 参考 / 附录
    ...                        # 可 autogenerate；运行时约束索引等

  playground/                  # 现有交互式示例（可保留或逐步迁入上面对应章节）
    ...
```

**说明：** 上表为**逻辑目标**；具体文件名与首次迁移范围由实现计划拆分，不要求一次到位。

---

## 6. 与仓库 `docs/` 的关系

| 位置                                 | 角色                                                                                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`docs/`（仓库根）**                | 设计规格、技术调研、阶段专文、路线图源文件；**长文与版本化设计**仍以这里为权威来源之一。                                                                  |
| **`apps/website/src/content/docs/`** | **面向使用者的**教程、API 导航、Playground 入口；应精炼，并通过链接引用 `docs/` 中必要深度内容（相对路径或文档站内「复制摘要 + 外链」策略由实现阶段定）。 |

避免两处分叉：若用户向说明与 `docs/` 专文冲突，以 **专文与实现代码** 为准，并更新网站摘要。

---

## 7. 当前站点与迁移提示

- **现状：** `apps/website` 已配置 **Starlight + React**，`astro.config.mjs` 内对 `@react-canvas/core|react|ui` 有 **Vite alias 至 `packages/*/src`**；侧栏以 **Guides + playground** 为主，`reference` 为 autogenerate。
- **迁移：** 将侧栏逐步从「单一大 Guides」迁向第 2 节的 **五分组**；现有 `playground/*.mdx` 可保留 URL 或加重定向/索引，避免外链失效（具体策略列入实现计划）。

---

## 8. 验收标准（文档站层面）

- 新读者可从 **入门** 在 10 分钟内找到：**安装方式**、**一条 Core 或 React 最小路径**、**路线图与当前完成度**的对应关系。
- **Core / React** 对同一能力的呈现方式符合第 2、3 节（Tabs 或互链）。
- **UI 组件库** 中每个已导出且对外承诺的组件，在文档站中有**独立可达页面**（或 autogenerate 生成的等价页面）。
- 全站视觉可通过 **第 4 节** 的主辅路径调整主题，而无需改 MDX 正文结构。

---

## 9. 后续步骤

- 实现前：按 brainstorming 流程，在对话中经用户确认后，使用 **writing-plans** 技能产出 **实现计划**（配置 Tailwind、`customCss`、侧栏与目录迁移步骤等）。
- **本规格文件**经审阅定稿后，再在仓库中开展具体代码与内容迁移。
