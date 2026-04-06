# 教程（Core TS + React）第一波 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 [2026-04-07-docs-tutorials-core-react-phase-a-design.md](../specs/2026-04-07-docs-tutorials-core-react-phase-a-design.md)：新增 **`intro/quickstart`** 与 **`guides/*`** 教程页，更新侧栏与 **Core/React 概览** 导航；**`vp check`** 与 **`cd apps/website && vp exec astro build`** 通过。

**Architecture:** 教程正文放在 **`src/content/docs/guides/`**（统一 TS/React **Tabs**）；**`intro/quickstart`** 单独放在 **`intro/`**。Starlight 组件用法以 **Context7 `/withastro/starlight`** 为准（撰写前查询 **Tabs / TabItem / Card** 等）。

**Tech Stack：** MDX、**`@astrojs/starlight/components`**、`apps/website/astro.config.mjs`。

**规格对照：** [2026-04-07-docs-tutorials-core-react-phase-a-design.md](../specs/2026-04-07-docs-tutorials-core-react-phase-a-design.md) 全文。

---

### Task 1：确认 Starlight Tabs API（Context7）

**Files：** 无（仅流程）

- [ ] **Step 1：** 查询 Context7 库 **`/withastro/starlight`**，关键词如：`Tabs TabItem import @astrojs/starlight/components`。

**预期 import（与官方一致）：**

```mdx
import { Tabs, TabItem } from "@astrojs/starlight/components";
```

- [ ] **Step 2：** 若项目 Starlight 版本与文档有差异，以 **`node_modules/@astrojs/starlight`** 导出为准微调 import。

---

### Task 2：新增 `intro/quickstart.mdx`

**Files：**

- Create: `apps/website/src/content/docs/intro/quickstart.mdx`

- [ ] **Step 1：** 创建页面，frontmatter `title` / `description` 为中文；正文说明 **React 最短路径**：`CanvasProvider` → `Canvas` → `View`（不写冗长 API 表），用 **Card** 链到 [Phase 1 playground](/playground/phase-1/) 与仓库 [phase-1-design.md](https://github.com/ouzhou/react-canvas/blob/main/docs/react/phase-1-design.md)。

- [ ] **Step 2：** `import { Card } from "@astrojs/starlight/components"` 前已在 Task 1 对照 Context7。

---

### Task 3：新增 `guides/` 下四篇教程（Tabs 骨架）

**Files：**

- Create: `apps/website/src/content/docs/guides/runtime-layout.mdx`
- Create: `apps/website/src/content/docs/guides/text.mdx`
- Create: `apps/website/src/content/docs/guides/pointer.mdx`
- Create: `apps/website/src/content/docs/guides/image-svg.mdx`

- [ ] **Step 1：** 每文件包含：`Tabs` + `TabItem label="Core（TS）"` / `TabItem label="React"`；代码块为 **说明性** 片段（可引用包中真实导出名：`initCanvasRuntime`、`ViewNode`、`Canvas`、`View` 等），并各含 **Playground** 与 **GitHub 专文** 链接（见规格 §4）。

**骨架示例（每篇按需替换标题与链接）：**

```mdx
---
title: 运行时与布局
description: Yoga、CanvasKit、场景树与绘制（阶段一）。
---

import { Tabs, TabItem } from "@astrojs/starlight/components";

## 摘要

对应路线图 **阶段一** 与里程碑 **M1**。完整设计见仓库专文。

<Tabs>
  <TabItem label="Core（TS）">
    {/* 最小初始化 + ViewNode / paint 概念，代码从 packages/core 导出出发 */}
  </TabItem>
  <TabItem label="React">{/* CanvasProvider、Canvas、View，链到 Playground */}</TabItem>
</Tabs>

## Playground

- [Phase 1](/playground/phase-1/)

## 延伸阅读

- [phase-1-design.md](https://github.com/ouzhou/react-canvas/blob/main/docs/react/phase-1-design.md)
```

- [ ] **Step 2：** `text.mdx` / `pointer.mdx` / `image-svg.mdx` 分别链到 `/playground/text`、`/playground/pointer`、`/playground/image-svg`，并补充对应 `docs/` 专文链接（存在则链，不存在则链 **roadmap** 或 **constraints**）。

---

### Task 4：更新 `astro.config.mjs` 侧栏

**Files：**

- Modify: `apps/website/astro.config.mjs`

- [ ] **Step 1：** 在 **`入门`** 的 `items` 中，于 **`intro/authoring`** 之后增加：`{ label: "快速上手", slug: "intro/quickstart" }`（顺序与规格 §2 一致）。

- [ ] **Step 2：** 在 `sidebar` 数组中 **`入门`** 分组之后插入新分组 **`教程`**（或 **`指南`**，与规格用词一致）：

```js
{
  label: "教程",
  items: [
    { label: "运行时与布局", slug: "guides/runtime-layout" },
    { label: "文字", slug: "guides/text" },
    { label: "指针与事件", slug: "guides/pointer" },
    { label: "图片与 SVG", slug: "guides/image-svg" },
  ],
},
```

- [ ] **Step 3：** `vp exec astro build`，若报 **slug 不存在**，检查 `guides/` 文件名与 slug（Starlight 对 `guides/foo.mdx` 的 slug 为 `guides/foo`）。

---

### Task 5：更新 `core/index.mdx` 与 `react/index.mdx`

**Files：**

- Modify: `apps/website/src/content/docs/core/index.mdx`
- Modify: `apps/website/src/content/docs/react/index.mdx`

- [ ] **Step 1：** 在 `core/index.mdx` 增加 **Card**（或段落 + 列表）指向 **`/guides/runtime-layout/`** 等教程入口。

- [ ] **Step 2：** 在 `react/index.mdx` 同样指向 **`/intro/quickstart/`** 与 **`guides/`** 各章。

---

### Task 6：验证

- [ ] **Step 1：** 仓库根目录 **`vp check`**。

- [ ] **Step 2：** **`cd apps/website && vp exec astro build`**。

**预期：** 构建成功；侧栏可见 **快速上手** 与 **教程** 下四章。

- [ ] **Step 3：** 提交

```bash
git add apps/website/src/content/docs apps/website/astro.config.mjs
git commit -m "docs(website): 教程第一波 quickstart + guides（Core/React Tabs）"
```

---

## 规格覆盖自检

| 规格章节           | 任务           |
| ------------------ | -------------- |
| §2 文件与侧栏      | Task 2–4       |
| §3 结构与 Context7 | Task 1、Task 3 |
| §4 互链            | Task 2–3       |
| §5 验收            | Task 6         |

---

## 执行交接

计划路径：`docs/superpowers/plans/2026-04-07-docs-tutorials-core-react-phase-a-implementation.md`

可在本会话 **inline** 按任务执行，或拆 **subagent** 逐任务实现。
