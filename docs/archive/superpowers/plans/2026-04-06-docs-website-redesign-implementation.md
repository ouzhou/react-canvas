# 文档网站（Starlight）IA、主题与内容迁移 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 **`apps/website`** 落地 [2026-04-06-docs-website-redesign-design.md](../specs/2026-04-06-docs-website-redesign-design.md)：集成 **Tailwind + `@astrojs/starlight-tailwind`**（主路径）与少量 **`customCss`**（辅路径）；将侧栏改为 **入门 / Core / React / UI 组件库 / 参考** 五组；建立 **`src/content/docs/`** 目标目录与占位页；保留 **`playground/`** 既有 slug；更新首页与路线图导读；**`vp build`**（在 `apps/website`）与 monorepo **`vp check`** 通过。

**Architecture:** 依赖 Starlight 官方 **CSS & Tailwind** 流程：`vite.plugins` 注册 `@tailwindcss/vite`；`starlight({ customCss: ['./src/styles/global.css'] })` 注入含 `@import '@astrojs/starlight-tailwind'` 的全局层叠；**不删除** 现有 `vite.resolve.alias` / `ssr.noExternal` / `optimizeDeps`。侧栏用 **显式 `items` + `autogenerate`** 组合；正文以 **MDX 占位** 为主，深度内容后续迭代迁入。

**Tech Stack:** Astro 6、`@astrojs/starlight` 0.38.x、`@astrojs/react`、Tailwind CSS v4（`@tailwindcss/vite`）、`@astrojs/starlight-tailwind`、React（playground 已有）。

**规格对照：** [2026-04-06-docs-website-redesign-design.md](../specs/2026-04-06-docs-website-redesign-design.md) 全文。

---

## 文件清单（将创建 / 修改）

| 路径                                                      | 职责                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `apps/website/package.json`                               | 新增依赖：`tailwindcss`、`@tailwindcss/vite`、`@astrojs/starlight-tailwind`（版本以 `vp add` 解析为准） |
| `apps/website/astro.config.mjs`                           | `vite.plugins`、`starlight.customCss`、`starlight.sidebar`、`starlight.title`/`social` 等               |
| `apps/website/src/styles/global.css`                      | Tailwind + Starlight 层叠与 `@theme` 占位                                                               |
| `apps/website/src/styles/custom.css`（可选）              | `--sl-*` 等辅路径微调                                                                                   |
| `apps/website/src/content/docs/index.mdx`                 | 首页：指向入门与分区，去掉 Starlight 模板默认 hero 文案（或保留 splash 策略见任务内）                   |
| `apps/website/src/content/docs/intro/installation.mdx`    | 安装与本地开发（pnpm / `vp`）                                                                           |
| `apps/website/src/content/docs/intro/roadmap.mdx`         | 路线图摘要 + 链至仓库 `docs/development-roadmap.md`                                                     |
| `apps/website/src/content/docs/intro/authoring.mdx`       | 站内作者指南（对应规格 §3：Frontmatter、Tabs/Steps/Card）                                               |
| `apps/website/src/content/docs/core/index.mdx`            | Core 分区索引（占位）                                                                                   |
| `apps/website/src/content/docs/react/index.mdx`           | React 分区索引（占位）                                                                                  |
| `apps/website/src/content/docs/ui/index.mdx`              | UI 分区索引；列出将逐页展开的导出                                                                       |
| `apps/website/src/content/docs/ui/button.mdx`             | `Button` 占位（与 `@react-canvas/ui` 导出一致）                                                         |
| `apps/website/src/content/docs/reference/constraints.mdx` | 运行时结构约束导读 + 链至 `docs/react/runtime-structure-constraints.md`                                 |
| `apps/website/src/content/docs/playground/*.mdx`          | **保留** 现有文件；仅必要时修正侧栏标签                                                                 |

**可删除或迁出（实现时二选一，本计划默认保留 slug）：** `guides/example.md` — 从侧栏移除或移到 `intro/` 并重定向说明。

---

### Task 1：在 `apps/website` 安装 Tailwind 与 Starlight 兼容包

**Files:**

- Modify: `apps/website/package.json`

- [ ] **Step 1：在仓库根目录执行依赖安装（使用 Vite+ 包装，勿直接用 pnpm）**

```bash
cd /Users/zhouou/Desktop/react-canvas
vp add -F website tailwindcss @tailwindcss/vite @astrojs/starlight-tailwind
```

**预期：** `apps/website/package.json` 的 `dependencies` 中出现上述包；若 `vp add` 报错，阅读 CLI 输出并改用其建议的 workspace 标志（例如仅对 `website` 生效）。

- [ ] **Step 2：确认无版本冲突**

```bash
vp check
```

**预期：** 通过；若有类型或 lockfile 问题，按 monorepo 惯例在根目录修复后再继续。

- [ ] **Step 3：提交**

```bash
git add apps/website/package.json pnpm-lock.yaml
git commit -m "chore(website): add tailwind and starlight-tailwind"
```

---

### Task 2：新增 `global.css` 并接入 Starlight

**Files:**

- Create: `apps/website/src/styles/global.css`

- [ ] **Step 1：创建 `global.css`（与 Starlight 文档一致的最小可用层叠）**

```css
/* apps/website/src/styles/global.css */
@layer base, starlight, theme, components, utilities;

@import "@astrojs/starlight-tailwind";
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);

@theme {
  /* 占位：后续按品牌替换；先保持与 Starlight 预设接近的 accent 可不改 */
  --font-sans: system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;
}
```

- [ ] **Step 2：提交**

```bash
git add apps/website/src/styles/global.css
git commit -m "feat(website): add Starlight Tailwind global.css"
```

---

### Task 3：修改 `astro.config.mjs` — Vite Tailwind 插件 + `customCss`

**Files:**

- Modify: `apps/website/astro.config.mjs`

- [ ] **Step 1：在文件顶部增加 import**

```js
import tailwindcss from "@tailwindcss/vite";
```

- [ ] **Step 2：在 `defineConfig({` 内给 `vite` 增加 `plugins`**

在 **保留** 现有 `vite.resolve`、`vite.optimizeDeps`、`vite.ssr` 的前提下，将 `vite` 改为同时包含 `plugins`：

```js
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@react-canvas/react": path.join(repoRoot, "packages/react/src/index.ts"),
        "@react-canvas/core": path.join(repoRoot, "packages/core/src/index.ts"),
        "@react-canvas/ui": path.join(repoRoot, "packages/ui/src/index.ts"),
      },
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react/jsx-runtime", "react-dom", "react-dom/client", "@astrojs/react"],
    },
    ssr: {
      noExternal: ["@react-canvas/react", "@react-canvas/core", "@react-canvas/ui"],
    },
  },
```

- [ ] **Step 3：在 `starlight({ ... })` 中增加 `customCss`**

```js
    starlight({
      title: "React Canvas",
      customCss: ["./src/styles/global.css"],
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/withastro/starlight" },
      ],
```

将 `social[0].href` 替换为本仓库真实 GitHub 地址（若尚无公开仓库，可暂时保留占位，但在发布前应改正）。

- [ ] **Step 4：验证构建**

```bash
cd apps/website && vp build
```

**预期：** 构建成功；若报 Tailwind 与 Vite 插件相关错误，对照 [Starlight CSS and Tailwind](https://starlight.astro.build/guides/css-and-tailwind/) 核对 `global.css` 的 `@import` 顺序与包版本。

- [ ] **Step 5：提交**

```bash
git add apps/website/astro.config.mjs
git commit -m "feat(website): wire Tailwind vite plugin and Starlight global.css"
```

---

### Task 4（可选）：辅路径 `custom.css` 微调 `--sl-*`

**Files:**

- Create: `apps/website/src/styles/custom.css`
- Modify: `apps/website/astro.config.mjs`（`customCss` 数组追加一项）

- [ ] **Step 1：创建并写入最小覆盖**

```css
/* apps/website/src/styles/custom.css */
:root {
  --sl-content-width: 50rem;
}
```

- [ ] **Step 2：在 `starlight({ customCss: [...] })` 中追加**

```js
customCss: ["./src/styles/global.css", "./src/styles/custom.css"],
```

- [ ] **Step 3：`vp build` 通过后提交**

```bash
git add apps/website/src/styles/custom.css apps/website/astro.config.mjs
git commit -m "feat(website): add optional Starlight CSS variable overrides"
```

---

### Task 5：重写侧栏为五组并保留 `playground/` 入口

**Files:**

- Modify: `apps/website/astro.config.mjs`

- [ ] **Step 1：将 `starlight.sidebar` 替换为下列结构（slug 与文件创建任务一致；`playground` 下保持现有文件名则 slug 不变）**

```js
      sidebar: [
        {
          label: "入门",
          items: [
            { label: "安装与开发", slug: "intro/installation" },
            { label: "路线图导读", slug: "intro/roadmap" },
            { label: "文档撰写指南", slug: "intro/authoring" },
          ],
        },
        {
          label: "Core（原生 TS）",
          items: [{ label: "概览", slug: "core/index" }],
        },
        {
          label: "React",
          items: [{ label: "概览", slug: "react/index" }],
        },
        {
          label: "UI 组件库",
          items: [
            { label: "概览", slug: "ui/index" },
            { label: "Button", slug: "ui/button" },
          ],
        },
        {
          label: "Playground",
          collapsed: false,
          items: [
            { label: "Phase 1", slug: "playground/phase-1" },
            { label: "Text", slug: "playground/text" },
            { label: "Button", slug: "playground/button" },
            { label: "@react-canvas/ui", slug: "playground/ui" },
            { label: "Pointer", slug: "playground/pointer" },
            { label: "Image & SVG", slug: "playground/image-svg" },
          ],
        },
        {
          label: "参考",
          autogenerate: { directory: "reference" },
        },
      ],
```

**注意：** Starlight 的 **`autogenerate`** 写在**分组**上（与 `label` 同级），不要写成 `items` 的子项。`reference/constraints.mdx` 放入 `reference/` 后会自动出现在侧栏。若仍存在 **`reference/example.md`**，与 `constraints` 并列展示；不需要时删除 `example.md` 以免占位干扰。

- [ ] **Step 2：`vp build`**

- [ ] **Step 3：提交**

```bash
git add apps/website/astro.config.mjs
git commit -m "feat(website): sidebar for intro, core, react, ui, playground, reference"
```

---

### Task 6：新建 `intro/`、`core/`、`react/`、`ui/`、`reference/` 占位 MDX

**Files:**

- Create: 下列各文件（若目录不存在则创建）

- [ ] **Step 1：`intro/installation.mdx`**

````mdx
---
title: 安装与开发
description: 在 monorepo 中安装依赖并运行文档站。
---

## 依赖

在仓库根目录使用 Vite+ 提供的包管理封装安装依赖（见仓库根 `AGENTS.md`）。

## 运行文档站

```bash
vp run website#dev
```
````

浏览器访问终端输出的本地 URL。生产构建：

```bash
cd apps/website && vp build
```

````

- [ ] **Step 2：`intro/roadmap.mdx`（含可点击的 GitHub 链至 `docs/development-roadmap.md`）**

将下面脚本输出粘贴到文内 Markdown 链接的 URL（一次性配置）：

```bash
# 在仓库根执行：由 origin 推导 GitHub blob URL
u=$(git remote get-url origin 2>/dev/null)
case "$u" in
  *github.com*)
    if echo "$u" | grep -q '^git@'; then
      path=$(echo "$u" | sed -E 's#git@github.com:([^/]+)/([^/.]+).*#\1/\2#')
    else
      path=$(echo "$u" | sed -E 's#https://github.com/([^/]+)/([^/.]+).*#\1/\2#')
    fi
    echo "https://github.com/${path}/blob/main/docs/development-roadmap.md"
    ;;
  *)
    echo "https://example.com/REPLACE-WITH-REPO/blob/main/docs/development-roadmap.md"
    ;;
esac
````

**`intro/roadmap.mdx` 模板：**

```mdx
---
title: 路线图导读
description: 与仓库 development-roadmap 对齐的阶段与能力。
---

## 摘要

React Canvas 的开发按阶段推进：核心渲染与 Yoga/CanvasKit、文字、交互、多媒体与滚动、高级绘制、打磨与文档等。详见仓库中的完整路线图。

## 完整文档

- [development-roadmap.md（仓库内）](在此粘贴上一步输出的 URL)

阅读时请结合当前仓库 **main** 分支；若分支不同，将链接中 `main` 替换为当前分支名。
```

- [ ] **Step 3：`intro/authoring.mdx`（摘录规格 §3）**

```mdx
---
title: 文档撰写指南
description: Starlight MDX 与内置组件的默认用法。
---

## Frontmatter

每页至少包含 `title` 与 `description`。

## 组件

- **Steps**：安装与分步操作。
- **Tabs**：同一能力下 Core（TS）与 React 并列。
- **Card**：提示、延伸阅读、跨页导航。

## 正文顺序

概念 → 示例 → 注意点。
```

- [ ] **Step 4：`core/index.mdx`**

```mdx
---
title: Core（原生 TS）概览
description: 使用 @react-canvas/core 的入口与路线图对应关系。
---

本站本节将按路线图阶段补充 **不经过 React** 的 API 与示例。当前为占位页；可先使用 **Playground** 与仓库 `docs/core` 专文。
```

- [ ] **Step 5：`react/index.mdx`**

```mdx
---
title: React 概览
description: CanvasProvider、宿主组件与交互。
---

本节与 **Core** 并行，示例以 React 为主；与 Core 同主题的内容将用 **Tabs** 并列。占位阶段请使用 **Playground**。
```

- [ ] **Step 6：`ui/index.mdx`**

```mdx
---
title: UI 组件库概览
description: "@react-canvas/ui 主题与组件。"
---

将逐步为以下导出补充独立页面（以 `packages/ui/src/index.ts` 为准）：

- `Button` 与 `getButtonStyles`
- `CanvasThemeProvider`、`useCanvasToken`、`getCanvasToken` 等主题 API
- `mergeViewStyles`、`resolveSx` 等样式辅助

当前仅 **Button** 有独立占位页。
```

- [ ] **Step 7：`ui/button.mdx`**

```mdx
---
title: Button
description: "@react-canvas/ui 的 Button 组件。"
---

import { Steps } from "@astrojs/starlight/components";

<Steps>

1. 在应用根部使用 `CanvasThemeProvider`（详见主题文档，待补全）。

2. 在画布树内渲染 `Button`（示例见 `playground/button`）。

</Steps>
```

- [ ] **Step 8：`reference/constraints.mdx`**

```mdx
---
title: 运行时结构约束
description: R-ROOT、R-HOST 等规则导读。
---

结构约束的完整说明见仓库 [runtime-structure-constraints.md](https://github.com/REPLACE/REPLACE/blob/main/docs/react/runtime-structure-constraints.md)（将 `REPLACE` 替换为与 `intro/roadmap` 相同的 owner/repo，或复用 roadmap 脚本生成的 URL 前缀 + `docs/react/runtime-structure-constraints.md`）。
```

**更稳妥：** 与 `roadmap.mdx` 相同，用 **blob URL** 指向 `docs/react/runtime-structure-constraints.md`。

- [ ] **Step 9：处理 `reference/example.md`**

若 Task 5 使用 `autogenerate`：删除或移动 `reference/example.md`，避免与新手路径重复。

- [ ] **Step 10：根目录 `vp check` 与 `apps/website` `vp build`**

- [ ] **Step 11：提交**

```bash
git add apps/website/src/content/docs
git commit -m "feat(website): add intro/core/react/ui/reference stub pages"
```

---

### Task 7：更新首页 `index.mdx`

**Files:**

- Modify: `apps/website/src/content/docs/index.mdx`

- [ ] **Step 1：将 hero `actions` 指向新路由（示例）**

```yaml
hero:
  actions:
    - text: 安装与开发
      link: /intro/installation/
      icon: right-arrow
    - text: Core 概览
      link: /core/
      icon: document
```

（路径以 Starlight 实际生成的尾部斜杠为准。）

- [ ] **Step 2：视需要保留或删除 `template: splash`** — 若希望首页显示侧栏，按 Starlight 文档删除 `template: splash` 行。

- [ ] **Step 3：`vp build` 后提交**

```bash
git add apps/website/src/content/docs/index.mdx
git commit -m "docs(website): retarget home hero to new IA"
```

---

### Task 8：规格验收对照（手动）

**Files:**

- 无（验证）

- [ ] **Step 1：自测「10 分钟内」路径（规格 §8）**

从 `/intro/installation/` 能到达安装说明；从 `/intro/roadmap/` 能到达完整路线图链接；从 `/core/` 或 `/react/` 至少一条路径可继续点到 Playground。

- [ ] **Step 2：UI 组件独立页（规格 §8）**

确认 `/ui/button/` 可访问。

- [ ] **Step 3：主题可调（规格 §8）**

修改 `global.css` 内 `@theme` 中 `--font-sans` 或 accent 相关变量后，`vp build` 仍成功，且页面样式有可见变化。

---

## 规格覆盖自检（计划作者已做）

| 规格章节           | 对应任务                             |
| ------------------ | ------------------------------------ |
| §2 五组 IA         | Task 5                               |
| §3 撰写约定        | Task 6 `intro/authoring.mdx`         |
| §4 主题主辅路径    | Task 1–4                             |
| §5 目录结构        | Task 5–6                             |
| §6 与 `docs/` 关系 | Task 6 `roadmap`、`constraints` 外链 |
| §7 迁移 playground | Task 5 侧栏保留 slug                 |
| §8 验收            | Task 8                               |

---

## 执行交接

**计划已保存至：** `docs/superpowers/plans/2026-04-06-docs-website-redesign-implementation.md`

**两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个任务派生子代理执行，任务间人工复核；需使用 **subagent-driven-development** 技能。
2. **Inline Execution** — 本会话内按任务顺序执行；需使用 **executing-plans** 技能并设检查点。

你更倾向哪一种？
