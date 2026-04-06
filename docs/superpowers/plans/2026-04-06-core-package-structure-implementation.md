# `@react-canvas/core` 源码与测试目录重构 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `packages/core` 的 `src/` 与 `tests/` 按 [2026-04-06-core-package-structure-design.md](../specs/2026-04-06-core-package-structure-design.md) 重组并完成重命名；**不改变** `@react-canvas/core` 包入口的导出符号；全仓库 **`vp check`**、**`vp test`** 通过。

**Architecture:** 以 **`git mv`** 保留历史移动文件；包根 **`src/index.ts`** 统一 re-export；模块间使用 **相对路径**（如 `../style/view-style.ts`）。`packages/react` 与 `packages/ui` 已使用 **`@react-canvas/core` 包入口**，通常**无需改 import**，除非存在对源码路径的硬编码。

**Tech Stack:** TypeScript、`vite-plus`（`vp check`、`vp test`）、`pnpm` workspace、`git`。

**规格对照：** [2026-04-06-core-package-structure-design.md](../specs/2026-04-06-core-package-structure-design.md) §2–§6。

---

## 文件映射（源文件：旧 → 新）

在 `packages/core/src/` 下执行（路径相对于 `src/`）：

| 旧路径                        | 新路径                            |
| ----------------------------- | --------------------------------- |
| `runtime-init.ts`             | `runtime/runtime.ts`              |
| `queue-layout-paint-frame.ts` | `runtime/frame-queue.ts`          |
| `yoga-init.ts`                | `layout/yoga.ts`                  |
| `yoga-map.ts`                 | `layout/yoga-map.ts`              |
| `layout.ts`                   | `layout/layout.ts`                |
| `layout-canvas-kit.ts`        | `layout/canvas-kit.ts`            |
| `canvaskit-init.ts`           | `render/canvaskit.ts`             |
| `canvaskit-locate.ts`         | `render/locate.ts`                |
| `paint.ts`                    | `render/paint.ts`                 |
| `paint-frame-requester.ts`    | `render/paint-frame-requester.ts` |
| `scene-node.ts`               | `scene/scene-node.ts`             |
| `view-node.ts`                | `scene/view-node.ts`              |
| `text-node.ts`                | `scene/text-node.ts`              |
| `image-node.ts`               | `scene/image-node.ts`             |
| `svg-path-node.ts`            | `scene/svg-path-node.ts`          |
| `view-style.ts`               | `style/view-style.ts`             |
| `text-style.ts`               | `style/text-style.ts`             |
| `paragraph-build.ts`          | `text/paragraph-build.ts`         |
| `default-paragraph-font.ts`   | `text/default-paragraph-font.ts`  |
| `image-cache.ts`              | `image/image-cache.ts`            |
| `image-decode.ts`             | `image/image-decode.ts`           |
| `image-rect.ts`               | `image/image-rect.ts`             |
| `viewbox-transform.ts`        | `geometry/viewbox.ts`             |
| `world-bounds.ts`             | `geometry/world-bounds.ts`        |
| `pointer-types.ts`            | `input/types.ts`                  |
| `hit-test.ts`                 | `input/hit-test.ts`               |
| `pointer-dispatch.ts`         | `input/dispatch.ts`               |
| `pointer-hover.ts`            | `input/hover.ts`                  |
| `click-activation.ts`         | `input/click.ts`                  |

**不动：** `index.ts`、`vite-env.d.ts`（仅更新 `index.ts` 内 re-export 路径）。

---

## 文件映射（测试：旧 → 新）

在 `packages/core/tests/` 下（路径相对于 `tests/`）：

| 旧路径                             | 新路径                              |
| ---------------------------------- | ----------------------------------- |
| `queue-layout-paint-frame.test.ts` | `runtime/frame-queue.test.ts`       |
| `yoga-map-layout.test.ts`          | `layout/yoga-map-layout.test.ts`    |
| `yoga-map-split.test.ts`           | `layout/yoga-map-split.test.ts`     |
| `layout-display.test.ts`           | `layout/layout-display.test.ts`     |
| `paint-display-none.test.ts`       | `render/paint-display-none.test.ts` |
| `view-node-tree.test.ts`           | `scene/view-node-tree.test.ts`      |
| `text-node-tree.test.ts`           | `scene/text-node-tree.test.ts`      |
| `font-family-parse.test.ts`        | `text/font-family-parse.test.ts`    |
| `line-height-skia.test.ts`         | `text/line-height-skia.test.ts`     |
| `image-rect.test.ts`               | `image/image-rect.test.ts`          |
| `viewbox-transform.test.ts`        | `geometry/viewbox.test.ts`          |
| `hit-test.test.ts`                 | `input/hit-test.test.ts`            |
| `pointer-dispatch.test.ts`         | `input/dispatch.test.ts`            |
| `pointer-hover.test.ts`            | `input/hover.test.ts`               |
| `click-activation.test.ts`         | `input/click.test.ts`               |

---

## 包根 `index.ts` 替换稿（完整）

将 `packages/core/src/index.ts` **整文件**替换为（导出名称与原文件一致，仅路径变化）：

```typescript
export { initYoga } from "./layout/yoga.ts";
export type { Yoga } from "./layout/yoga.ts";
export { initCanvasKit } from "./render/canvaskit.ts";
export { initCanvasRuntime } from "./runtime/runtime.ts";
export type { CanvasRuntime, InitCanvasRuntimeOptions } from "./runtime/runtime.ts";
export {
  BUILTIN_PARAGRAPH_FONT_URL,
  ensureDefaultParagraphFonts,
} from "./text/default-paragraph-font.ts";
export type { CanvasKit, CanvasKitInitOptions, Surface } from "canvaskit-wasm";
export { ViewNode } from "./scene/view-node.ts";
export type { ViewVisualProps } from "./scene/view-node.ts";
export type { SceneNode } from "./scene/scene-node.ts";
export { TextNode, collectParagraphSpans, isTextInstance } from "./scene/text-node.ts";
export type { TextInstance } from "./scene/text-node.ts";
export {
  applyRNLayoutDefaults,
  applyStylesToYoga,
  resetAndApplyStyles,
  splitStyle,
} from "./layout/yoga-map.ts";
export { calculateLayoutRoot, isDisplayNone, syncLayoutFromYoga } from "./layout/layout.ts";
export { paintNode, paintScene } from "./render/paint.ts";
export type { DimensionValue, ViewStyle } from "./style/view-style.ts";
export type { TextOnlyProps, TextStyle } from "./style/text-style.ts";
export { mergeTextProps, splitTextStyle } from "./style/text-style.ts";
export {
  queueLayoutPaintFrame,
  resetLayoutPaintQueue,
  resetLayoutPaintQueueForTests,
} from "./runtime/frame-queue.ts";
export {
  hasParagraphFontsRegistered,
  lineHeightToSkHeightMultiplier,
  parseFontFamilyList,
  setParagraphFontFamilies,
  setParagraphFontForTests,
} from "./text/paragraph-build.ts";
export type { ParagraphSpan } from "./text/paragraph-build.ts";
export type { CanvasSyntheticPointerEvent, InteractionHandlers } from "./input/types.ts";
export { hitTest, buildPathToRoot } from "./input/hit-test.ts";
export { dispatchBubble } from "./input/dispatch.ts";
export { getWorldBounds, containsPagePoint, getWorldOffset } from "./geometry/world-bounds.ts";
export {
  shouldEmitClick,
  DEFAULT_CLICK_MOVE_THRESHOLD_PX,
  type PointerDownSnapshot,
} from "./input/click.ts";
export { diffHoverEnterLeave, dispatchPointerEnterLeave } from "./input/hover.ts";
export { computeImageSrcDestRects, type ImageRect, type ResizeMode } from "./image/image-rect.ts";
export { parseViewBox, viewBoxToAffine, type ViewBox } from "./geometry/viewbox.ts";
export { peekCachedImage, putCachedImage, clearImageCacheForTests } from "./image/image-cache.ts";
export { decodeImageFromEncoded, loadImageFromUri } from "./image/image-decode.ts";
export {
  registerPaintFrameRequester,
  requestRedrawFromImage,
} from "./render/paint-frame-requester.ts";
export { ImageNode, type ImageNodePropPayload, type ImageSource } from "./scene/image-node.ts";
export {
  SvgPathNode,
  type SvgPathPropPayload,
  type SvgPathStrokeLinecap,
  type SvgPathStrokeLinejoin,
} from "./scene/svg-path-node.ts";
```

---

## 各文件 `import` 修正要点（按新位置）

下列为移动后各文件应使用的 **相对路径**（实现时以 `vp check` 报错为准补全）。`./` 仅用于同目录。

| 文件                             | 关键 import（示例）                                                                                                                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runtime/runtime.ts`             | `../text/default-paragraph-font.ts`、`../render/canvaskit.ts`、`../layout/yoga.ts`                                                                                                                               |
| `runtime/frame-queue.ts`         | `../text/default-paragraph-font.ts`、`../render/paint.ts`、`../text/paragraph-build.ts`、`../scene/view-node.ts`                                                                                                 |
| `layout/yoga-map.ts`             | `../style/view-style.ts`                                                                                                                                                                                         |
| `layout/layout.ts`               | `./canvas-kit.ts`、`../scene/view-node.ts`                                                                                                                                                                       |
| `text/paragraph-build.ts`        | `../style/text-style.ts`、`../layout/canvas-kit.ts`                                                                                                                                                              |
| `text/default-paragraph-font.ts` | `./paragraph-build.ts`                                                                                                                                                                                           |
| `style/text-style.ts`            | `./view-style.ts`                                                                                                                                                                                                |
| `scene/view-node.ts`             | `../layout/yoga-map.ts`、`./scene-node.ts`、`../input/types.ts`、`../style/view-style.ts`、`../layout/layout.ts`                                                                                                 |
| `scene/text-node.ts`             | `../text/paragraph-build.ts`、`./scene-node.ts`、`../style/text-style.ts`、`./view-node.ts`                                                                                                                      |
| `scene/image-node.ts`            | `../image/image-decode.ts`、`../image/image-cache.ts`、`../render/paint-frame-requester.ts`、`../image/image-rect.ts`、`../style/view-style.ts`、`./view-node.ts`                                                |
| `scene/svg-path-node.ts`         | `../style/view-style.ts`、`./view-node.ts`                                                                                                                                                                       |
| `render/canvaskit.ts`            | `./locate.ts`                                                                                                                                                                                                    |
| `render/paint.ts`                | `../text/paragraph-build.ts`、`../image/image-rect.ts`、`../scene/image-node.ts`、`../scene/svg-path-node.ts`、`../scene/text-node.ts`、`../layout/layout.ts`、`../scene/view-node.ts`、`../geometry/viewbox.ts` |
| `input/types.ts`                 | `../scene/view-node.ts`                                                                                                                                                                                          |
| `input/hit-test.ts`              | `../layout/layout.ts`、`../scene/text-node.ts`、`../scene/view-node.ts`                                                                                                                                          |
| `input/dispatch.ts`              | `./types.ts`、`../geometry/world-bounds.ts`、`../scene/view-node.ts`                                                                                                                                             |
| `input/hover.ts`                 | `./hit-test.ts`、`./types.ts`、`../geometry/world-bounds.ts`、`../scene/view-node.ts`                                                                                                                            |
| `input/click.ts`                 | `../geometry/world-bounds.ts`、`../scene/view-node.ts`                                                                                                                                                           |
| `geometry/world-bounds.ts`       | `../scene/view-node.ts`                                                                                                                                                                                          |

---

## 测试文件 import 修正

- 所有测试从 `../src/<旧文件>.ts` 改为 **`../src/<域>/<新文件>.ts`**（与上表一致）。
- `tests/runtime/frame-queue.test.ts`：将 `../src/queue-layout-paint-frame.ts` 改为 `../src/runtime/frame-queue.ts`；若仍从 `../src/index.ts` 导入，路径保持 `../src/index.ts`（深度不变）。
- `tests/input/dispatch.test.ts`：`dispatchBubble` 从 `../src/input/dispatch.ts`。
- `tests/input/hover.test.ts`：`diffHoverEnterLeave` 从 `../src/input/hover.ts`；`initYoga` 从 `../src/layout/yoga.ts`；`ViewNode` 从 `../src/scene/view-node.ts`。
- `tests/input/click.test.ts`：`shouldEmitClick` 从 `../src/input/click.ts`。
- `tests/geometry/viewbox.test.ts`：`parseViewBox`、`viewBoxToAffine` 从 `../src/geometry/viewbox.ts`。

---

### Task 0: 基线与检索

**Files:**

- Read-only：仓库根、`packages/core`

- [ ] **Step 1：记录基线**

在仓库根执行：

```bash
cd /Users/zhouou/Desktop/react-canvas && vp check && vp test
```

预期：当前 `main` 上 **全部通过**（若失败，先修复再重构）。

- [ ] **Step 2：确认无 deep import**

```bash
cd /Users/zhouou/Desktop/react-canvas && rg "@react-canvas/core/" packages --glob "*.ts" --glob "*.tsx"
```

预期：**无** `@react-canvas/core/src/...` 之类子路径（仅有 `@react-canvas/core` 包入口则符合规格）。

---

### Task 1: 创建目录并移动 `src` 下源文件

**Files:**

- Modify：`packages/core/src/**`（`git mv`）

- [ ] **Step 1：进入 `src` 并创建子目录**

```bash
cd /Users/zhouou/Desktop/react-canvas/packages/core/src
mkdir -p runtime layout render scene style text image geometry input
```

- [ ] **Step 2：执行 `git mv`（整批）**

```bash
cd /Users/zhouou/Desktop/react-canvas/packages/core/src
git mv runtime-init.ts runtime/runtime.ts
git mv queue-layout-paint-frame.ts runtime/frame-queue.ts
git mv yoga-init.ts layout/yoga.ts
git mv yoga-map.ts layout/yoga-map.ts
git mv layout.ts layout/layout.ts
git mv layout-canvas-kit.ts layout/canvas-kit.ts
git mv canvaskit-init.ts render/canvaskit.ts
git mv canvaskit-locate.ts render/locate.ts
git mv paint.ts render/paint.ts
git mv paint-frame-requester.ts render/paint-frame-requester.ts
git mv scene-node.ts scene/scene-node.ts
git mv view-node.ts scene/view-node.ts
git mv text-node.ts scene/text-node.ts
git mv image-node.ts scene/image-node.ts
git mv svg-path-node.ts scene/svg-path-node.ts
git mv view-style.ts style/view-style.ts
git mv text-style.ts style/text-style.ts
git mv paragraph-build.ts text/paragraph-build.ts
git mv default-paragraph-font.ts text/default-paragraph-font.ts
git mv image-cache.ts image/image-cache.ts
git mv image-decode.ts image/image-decode.ts
git mv image-rect.ts image/image-rect.ts
git mv viewbox-transform.ts geometry/viewbox.ts
git mv world-bounds.ts geometry/world-bounds.ts
git mv pointer-types.ts input/types.ts
git mv hit-test.ts input/hit-test.ts
git mv pointer-dispatch.ts input/dispatch.ts
git mv pointer-hover.ts input/hover.ts
git mv click-activation.ts input/click.ts
```

- [ ] **Step 3：确认 `index.ts` 仍在 `src/` 根且未误移动**

```bash
test -f /Users/zhouou/Desktop/react-canvas/packages/core/src/index.ts && echo ok
```

预期：输出 `ok`。

---

### Task 2: 创建目录并移动 `tests` 下文件

**Files:**

- Modify：`packages/core/tests/**`

- [ ] **Step 1：创建测试子目录并 `git mv`**

```bash
cd /Users/zhouou/Desktop/react-canvas/packages/core/tests
mkdir -p runtime layout render scene text image geometry input
git mv queue-layout-paint-frame.test.ts runtime/frame-queue.test.ts
git mv yoga-map-layout.test.ts layout/yoga-map-layout.test.ts
git mv yoga-map-split.test.ts layout/yoga-map-split.test.ts
git mv layout-display.test.ts layout/layout-display.test.ts
git mv paint-display-none.test.ts render/paint-display-none.test.ts
git mv view-node-tree.test.ts scene/view-node-tree.test.ts
git mv text-node-tree.test.ts scene/text-node-tree.test.ts
git mv font-family-parse.test.ts text/font-family-parse.test.ts
git mv line-height-skia.test.ts text/line-height-skia.test.ts
git mv image-rect.test.ts image/image-rect.test.ts
git mv viewbox-transform.test.ts geometry/viewbox.test.ts
git mv hit-test.test.ts input/hit-test.test.ts
git mv pointer-dispatch.test.ts input/dispatch.test.ts
git mv pointer-hover.test.ts input/hover.test.ts
git mv click-activation.test.ts input/click.test.ts
```

---

### Task 3: 更新 `packages/core/src/index.ts`

**Files:**

- Modify：`packages/core/src/index.ts`

- [ ] **Step 1：用本计划「包根 index.ts 替换稿」整文件替换 `index.ts`**

- [ ] **Step 2：运行类型检查**

```bash
cd /Users/zhouou/Desktop/react-canvas/packages/core && vp check
```

预期：仍可能有 **大量** 模块内 `import` 未更新导致的错误；进入 Task 4。

---

### Task 4: 修正 `packages/core/src` 内所有相对 import

**Files:**

- Modify：`packages/core/src/runtime/*.ts`、`layout/*.ts`、`render/*.ts`、`scene/*.ts`、`style/*.ts`、`text/*.ts`、`image/*.ts`、`geometry/*.ts`、`input/*.ts`

- [ ] **Step 1：按「各文件 import 修正要点」表，逐个文件更新 `from "./..."` / `from "../..."`**

优先修改被依赖较多的文件：`style/*`、`geometry/*`、`input/types.ts`、`layout/*`、`scene/*`、`text/*`、`render/paint.ts`、`runtime/*`。

- [ ] **Step 2：再次运行**

```bash
cd /Users/zhouou/Desktop/react-canvas/packages/core && vp check
```

预期：**0** 类型错误。

---

### Task 5: 修正 `packages/core/tests` 内 import

**Files:**

- Modify：`packages/core/tests/**/*.test.ts`

- [ ] **Step 1：按「测试文件 import 修正」节更新所有 `../src/...` 路径**

- [ ] **Step 2：运行**

```bash
cd /Users/zhouou/Desktop/react-canvas/packages/core && vp test
```

预期：**全部通过**。

---

### Task 6: 全仓库验证与其它包

**Files:**

- Read-only：`packages/react`、`packages/ui`、仓库根

- [ ] **Step 1：在仓库根执行**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp check && vp test
```

预期：**全部通过**（`react` / `ui` 若引用 `@react-canvas/core` 入口，应无需改代码）。

- [ ] **Step 2：若 `vp check` 报其它包解析失败，仅修复与本次路径相关的配置或 import**

---

### Task 7: 文档路径更新（可选但推荐）

**Files:**

- Modify：`docs/react/react-yoga-text-nodes.md`、`docs/core/text-line-wrapping.md` 等（凡含 `packages/core/src/<旧路径>` 的表格与正文）

- [ ] **Step 1：检索并替换为与新结构一致的路径**

```bash
cd /Users/zhouou/Desktop/react-canvas && rg "packages/core/src/" docs --glob "*.md"
```

将例如 `packages/core/src/text-node.ts` 更新为 `packages/core/src/scene/text-node.ts`，`paragraph-build.ts` → `packages/core/src/text/paragraph-build.ts`，`paint.ts` → `packages/core/src/render/paint.ts`，`viewbox-transform.ts` → `packages/core/src/geometry/viewbox.ts`，等。

**说明：** `docs/superpowers/plans/` 下历史计划文中的旧路径可 **保留** 为考古记录，或仅加一句「路径已随 2026-04-06 重构迁移」——二选一，与团队习惯一致即可。

---

### Task 8: 规格书对照与提交

**Files:**

- Modify：`docs/superpowers/specs/2026-04-06-core-package-structure-design.md`（§7 修订记录，可选一行）

- [ ] **Step 1：对照规格 §6 验收标准自检**

- [ ] **Step 2：提交（示例）**

```bash
cd /Users/zhouou/Desktop/react-canvas
git add packages/core/src packages/core/tests docs/react docs/core docs/superpowers/specs/2026-04-06-core-package-structure-design.md
git status
git commit -m "refactor(core): reorganize src and tests into domain folders"
```

根据实际是否修改 `docs/`，调整 `git add` 范围。

---

## Plan self-review

| 检查项                | 结果                                  |
| --------------------- | ------------------------------------- |
| Spec §2 目录树        | Task 1–2 + `index.ts` 覆盖            |
| Spec §3 命名对照      | 映射表与 `git mv` 一致                |
| Spec §4 测试镜像      | Task 2、Task 5 覆盖                   |
| Spec §5–§6 API 与验收 | Task 3（仅路径）、Task 6              |
| Placeholder           | 无 TBD                                |
| 类型/导出名           | `index.ts` 导出名与原 `index.ts` 一致 |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-06-core-package-structure-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach do you want?
