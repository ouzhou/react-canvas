# `@react-canvas/react` 源码与测试目录重构 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 [2026-04-07-react-package-structure-design.md](../specs/2026-04-07-react-package-structure-design.md) 重组 `packages/react` 的 `src/` 与 `tests/`；**不改变** `@react-canvas/react` 包入口导出符号。

**Architecture:** `git mv` 保留历史；包根 **`src/index.ts`** 统一 re-export；模块间相对路径按域划分（`canvas/`、`reconciler/`、`hosts/`、`input/`）。

**Tech Stack:** TypeScript、`vite-plus`（`vp check`、`vp test`）、`pnpm` workspace。

---

## 包根 `index.ts` 替换稿（完整）

将 `packages/react/src/index.ts` **整文件**替换为：

```typescript
export { Canvas } from "./canvas/canvas.tsx";
export type { CanvasProps } from "./canvas/canvas.tsx";
export { CanvasProvider } from "./canvas/canvas-provider.tsx";
export type { CanvasProviderProps, CanvasProviderRenderState } from "./canvas/canvas-provider.tsx";
export { CanvasRuntimeContext, useCanvasRuntime } from "./canvas/context.ts";
export type { CanvasRuntimeValue } from "./canvas/context.ts";
export { View, type ViewProps } from "./hosts/view.ts";
export { Text, type TextProps } from "./hosts/text.ts";
export { Image, type ImageProps } from "./hosts/image.ts";
export { SvgPath, type SvgPathProps } from "./hosts/svg-path.ts";
export type {
  CanvasSyntheticPointerEvent,
  InitCanvasRuntimeOptions,
  InteractionHandlers,
  ResizeMode,
} from "@react-canvas/core";
export {
  BUILTIN_PARAGRAPH_FONT_URL,
  ensureDefaultParagraphFonts,
  hasParagraphFontsRegistered,
  lineHeightToSkHeightMultiplier,
  parseFontFamilyList,
  resetLayoutPaintQueueForTests,
  setParagraphFontFamilies,
  setParagraphFontForTests,
} from "@react-canvas/core";
```

---

## 各文件 import 修正要点（相对路径）

| 文件                         | 关键 import                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `canvas/canvas.tsx`          | `./canvas-backing-store.ts`、`./context.ts`、`../input/canvas-pointer.ts`、`../reconciler/host-config.ts`、`../hosts/view.ts` |
| `canvas/canvas-provider.tsx` | `./context.ts`                                                                                                                |
| `reconciler/host-config.ts`  | `../hosts/image.ts`、`../hosts/svg-path.ts`、`../hosts/text.ts`、`../hosts/view.ts`（及 `@react-canvas/core`）                |

---

## `git mv` 清单（在 `packages/react/src`）

```bash
mkdir -p canvas reconciler hosts input
git mv canvas.tsx canvas/canvas.tsx
git mv canvas-provider.tsx canvas/canvas-provider.tsx
git mv canvas-backing-store.ts canvas/canvas-backing-store.ts
git mv context.ts canvas/context.ts
git mv reconciler-config.ts reconciler/host-config.ts
git mv view.ts hosts/view.ts
git mv text.ts hosts/text.ts
git mv image.ts hosts/image.ts
git mv svg-path.ts hosts/svg-path.ts
git mv canvas-pointer.ts input/canvas-pointer.ts
```

## `git mv` 清单（在 `packages/react/tests`）

```bash
mkdir -p canvas hosts
git mv canvas-view.test.tsx canvas/canvas-view.test.tsx
git mv context.test.tsx canvas/context.test.tsx
git mv canvas-backing-store.test.ts canvas/canvas-backing-store.test.ts
git mv text-host.test.tsx hosts/text-host.test.tsx
```

---

## 测试 import 规则

- 自 **`tests/canvas/`**、**`tests/hosts/`** 内文件：使用 **`../../src/<域>/...`**（指向 `packages/react/src`）。
- **`tests/setup.ts`**：保持 **`../../core/src/render/locate.ts`**（相对 `tests/` 根不变）。

---

### Task 0: 基线

- [ ] `cd packages/react && vp check && vp test` — 全绿后再迁移。

### Task 1: 移动源文件并更新 `index.ts` + 内部 import

- [ ] 执行上文 `src` 的 `mkdir` + `git mv`。
- [ ] 替换 `index.ts`（见「包根替换稿」）。
- [ ] 按「import 修正要点」更新 `canvas/canvas.tsx`、`canvas/canvas-provider.tsx`、`reconciler/host-config.ts`。
- [ ] `cd packages/react && vp check` 至无类型错误。

### Task 2: 移动测试并更新 import

- [ ] 执行上文 `tests` 的 `mkdir` + `git mv`。
- [ ] 将各测试文件中的 `../src/...` 改为 **`../../src/<域>/...`**。
- [ ] `vp test`。

### Task 3: 文档与验收

- [ ] `rg "packages/react/src/" docs` — 更新仍指向旧扁平路径的文档（若有）。
- [ ] `packages/react`：`vp check && vp test`。
- [ ] 提交：`refactor(react): reorganize src and tests into canvas/reconciler/hosts/input`。

---

## Plan self-review

| 检查项     | 结果                          |
| ---------- | ----------------------------- |
| Spec §2–§4 | Task 1–2 覆盖                 |
| 公开 API   | `index.ts` 导出名与迁移前一致 |
| setup.ts   | 路径不变（验证 §4）           |

---

## Execution handoff

Plan saved to `docs/superpowers/plans/2026-04-07-react-package-structure-implementation.md`. Implement via subagent-driven or inline execution per team preference.
