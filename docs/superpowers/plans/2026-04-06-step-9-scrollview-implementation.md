# Step 9 — ScrollView（V1）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在单画布内交付 **纵向 `ScrollView`**：**拖拽**与 **滚轮** 更新 **`contentOffset`**；**绘制**与 **命中测试** 与视口 **裁剪**一致；**布局**导出 **maxScroll** 并 **钳制**偏移。满足 [2026-04-06-step-9-scrollview-design.md](../specs/2026-04-06-step-9-scrollview-design.md)。**不含** 惯性、嵌套滚动、弹性、滚动条；**水平** 可 API 占位。

**Architecture:** **`ScrollViewNode`**（`type: "ScrollView"`）扩展 **`ViewNode`**，承载 **`scrollX` / `scrollY`**（V1 以 **`scrollY`** 为主）；**`paintNode`** 在视口 **clip** 之后 **`translate(0, -scrollY)`** 再绘制子节点；**`hitTestRecursive`** 对子递归传入 **`world × translate(0, -scrollY)`**，与绘制一致。**布局**在 **`syncLayoutFromYoga` 之后**用 **视口高度** 与 **内容高度**（优先 **第一子节点** `layout.height`，或规格约定的聚合方式）计算 **`maxScrollY`** 并钳制。**React** 增加 **`hosts/scroll-view.tsx`**、**host-config** 分支、**canvas-pointer**（或并列模块）处理 **拖拽滚动** 与 **`wheel`** + **`preventDefault`**，更新节点偏移并 **`queueLayoutPaintFrame`**。

**Tech Stack:** Yoga（`Overflow.Scroll` 等）、CanvasKit `SkCanvas` save/clip/translate、现有 `queueLayoutPaintFrame` / `registerPaintFrameRequester`；测试 **`vite-plus/test`**（见根目录 `AGENTS.md`）。

**前置阅读:** [2026-04-06-step-9-scrollview-design.md](../specs/2026-04-06-step-9-scrollview-design.md)、`packages/core/src/render/paint.ts`、`packages/core/src/input/hit-test.ts`、`packages/react/src/input/canvas-pointer.ts`、`packages/react/src/reconciler/host-config.ts`（`createInstance` / `commitUpdate`）。

---

## 文件结构（计划新增 / 大改）

| 路径                                                                   | 职责                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/scene/scroll-view-node.ts`（或并入 `view-node.ts`） | `ScrollViewNode`：继承 `ViewNode`，`type === "ScrollView"`；**mutable** `scrollX`/`scrollY`；**`clampScrollOffsetsAfterLayout()`**（布局后调用）；构造或 `setStyle` 时把 **Yoga `overflow`** 设为 **`Scroll`** 以量测可高于视口的内容（与现有 `applyStylesToYoga` 末尾 `setOverflow(Visible)` 协调：**ScrollView 专用路径**覆盖）。       |
| `packages/core/src/render/paint.ts`                                    | `paintNode`：`ScrollView` 分支：背景/边框同 `View`；**clip 视口**；**`translate(0, -scrollY)`**；子 **正序** `paintNode`；`restore`。                                                                                                                                                                                                     |
| `packages/core/src/input/hit-test.ts`                                  | `ScrollView`：在命中子节点前 **`parentWorldForChildren = Matrix.multiply(world, Matrix.translated(0, -scrollY))`**（与 paint 一致）；**`localPointHitsNodeBounds`** 仍用视口局部矩形。                                                                                                                                                    |
| `packages/core/src/layout/layout.ts` 或 `scroll-view-node.ts`          | **`getScrollContentExtentY(node: ScrollViewNode): number`**：V1 从 **`children[0]`** 读取 **`layout.height`**（无子则 `0`）；**`maxScrollY = max(0, extent - viewportH)`**。                                                                                                                                                              |
| `packages/core/src/index.ts`                                           | 导出 `ScrollViewNode`（及测试所需 API）。                                                                                                                                                                                                                                                                                                 |
| `packages/core/tests/input/hit-test.test.ts`（或新文件）               | 手工 **`layout`** + **`scrollY`** 的命中用例。                                                                                                                                                                                                                                                                                            |
| `packages/core/tests/render/` 或 paint 相关                            | 可选：轻量断言（若项目已有 snapshot 模式则对齐，否则以 hit-test 为主）。                                                                                                                                                                                                                                                                  |
| `packages/react/src/hosts/scroll-view.tsx`                             | 组件 **`ScrollView`**：`style`、`horizontal?: boolean`（文档：V1 横向 no-op）、**`children`**。                                                                                                                                                                                                                                           |
| `packages/react/src/reconciler/host-config.ts`                         | **`createInstance` / `commitUpdate`** 支持 **`ScrollView`** 字符串；**`finalizeInitialChildren`** 若需 `viewNodeRef` 对齐 `View`。                                                                                                                                                                                                        |
| `packages/react/src/index.ts`、**`jsx-augment.d.ts`**（若存在）        | 导出 **`ScrollView`**；类型。                                                                                                                                                                                                                                                                                                             |
| `packages/react/src/input/canvas-pointer.ts`                           | **拖拽**：`pointerdown` 命中 **`ScrollView`** 时记录 **pointerId → { node, lastY }**；**`pointermove`**（document）更新 **`scrollY`** 并 **request paint**；**`pointerup`** 清理。**`wheel`** 在 **canvas** 上 **`{ passive: false }`**，`preventDefault`，按 **`deltaY`** 调整 **`scrollY`**，命中由 **`hitTest`** 找 **`ScrollView`**。 |
| `packages/react/src/canvas/canvas.tsx`                                 | 确保 **layout/paint** 在 **scroll 仅变** 时仍触发（若当前仅在 commit 排队，则 **指针路径**显式 **`queueLayoutPaintFrame`**）。                                                                                                                                                                                                            |
| `apps/website/` 或 `packages/ui`                                       | 可选：文档站 **demo**（路线图验收片段）。                                                                                                                                                                                                                                                                                                 |
| `docs/development-roadmap.md`                                          | Step 9 状态更新（实现完成后）。                                                                                                                                                                                                                                                                                                           |

---

### Task 1: Core — `ScrollViewNode` 与布局钳制

**Files:**

- Create: `packages/core/src/scene/scroll-view-node.ts`
- Modify: `packages/core/src/scene/view-node.ts`（仅当需共享基类逻辑；否则保持最小改动）
- Modify: `packages/core/src/layout/yoga-map.ts` 或 **ScrollViewNode** 内 **构造后** `this.yogaNode.setOverflow(Overflow.Scroll)`（避免破坏普通 `View`）
- Modify: `packages/core/src/index.ts`
- Create/Modify: `packages/core/tests/scroll-view-layout.test.ts`（新文件）

- [ ] **Step 1:** 定义 **`export class ScrollViewNode extends ViewNode`**，`constructor(yoga)` 调用 `super(yoga, "ScrollView")`，**`this.scrollX = 0`**、**`this.scrollY = 0`**；在 **不经过会破坏的 `reset`** 的前提下，为 **本节点 yoga** 设置 **`Overflow.Scroll`**（从 `yoga-layout/load` 导入 **`Overflow`**）。

- [ ] **Step 2:** 实现 **`clampScrollOffsetsAfterLayout(): void`**：  
       `const vp = this.layout.height`；  
       `const contentH = this.children[0] ? (this.children[0] as ViewNode).layout.height : 0`；  
       `const maxY = Math.max(0, contentH - vp)`；  
       `this.scrollY = Math.min(maxY, Math.max(0, this.scrollY))`；  
       **`scrollX`** 同理占位 **`maxX`**（V1 若横向未滚，可 **`maxX = 0`**）。

- [ ] **Step 3:** 单元测试（无 CanvasKit）：**new ScrollViewNode** + 手工 **`layout`** 与 **一个子 `ViewNode`** 的 **`layout.height`**，断言 **`clampScrollOffsetsAfterLayout`** 后 **`scrollY`** 被钳制。

- [ ] **Step 4:** 在 **`calculateLayoutRoot` → `syncLayoutFromYoga` 之后** 的单一出口（推荐 **`queueLayoutPaintFrame` 前** 或 **`layout.ts` 内遍历**）对 **`type === "ScrollView"`** 调用 **`clampScrollOffsetsAfterLayout`**——具体挂点以实现时 **`grep queueLayoutPaintFrame`** 定锚点；计划要求：**每次 Yoga 同步后**滚动容器偏移合法。

- [ ] **Step 5:** Run: `vp test packages/core/tests/scroll-view-layout.test.ts`  
       Expected: PASS

- [ ] **Step 6:** Run: `vp check`  
       Expected: PASS

- [ ] **Step 7:** Commit:

```bash
git add packages/core/src/scene/scroll-view-node.ts packages/core/src/layout/layout.ts packages/core/src/index.ts packages/core/tests/scroll-view-layout.test.ts
git commit -m "feat(core): ScrollViewNode layout clamp"
```

---

### Task 2: Core — `paintNode` 绘制滚动偏移

**Files:**

- Modify: `packages/core/src/render/paint.ts`
- Modify: `packages/core/tests/`（可选：视觉回归若无可跳过，以 Task 3 命中为准）

- [ ] **Step 1:** 在 **`paint.ts`** 顶部 **import `ScrollViewNode`**（或 `type` 字符串分支避免循环依赖）。

- [ ] **Step 2:** 在 **`paintNode`** 的 **通用 `View` 分支**（当前 **`let clipViewChildren`** 一段）**之前**，增加 **`if (node.type === "ScrollView")`**：
  - 与 **`View`** 相同：**背景、边框、opacity layer**；
  - **`overflow`**：视口应 **始终 clip**（与 RN ScrollView 一致）；若 **`ScrollView` 默认 `overflow: 'hidden'`**，走现有 **`clipToLayoutRoundedRect`**；
  - **`skCanvas.save()`** → **`translate(0, -scrollY)`**（从 **`(node as ScrollViewNode).scrollY`** 读取）；
  - **`for (const c of getSortedChildrenForPaint(node)) paintNode(c, ...)`**；
  - **`skCanvas.restore()`**（与 save 成对，含 clip 时 **先 restore clip 栈**——顺序须与 **`View`** clip 子节点一致：**clip → translate → children → restore translate → restore clip**）。  
    精确顺序应与 **`hit-test`** 矩阵乘法一致（见 Task 3）。

- [ ] **Step 3:** **`return`**，避免落入默认 **`View`** 的双路径绘制。

- [ ] **Step 4:** Run: `vp test`  
       Expected: 全通过

- [ ] **Step 5:** Run: `vp check`  
       Expected: PASS

- [ ] **Step 6:** Commit:

```bash
git add packages/core/src/render/paint.ts
git commit -m "feat(core): paint ScrollView content offset"
```

---

### Task 3: Core — `hitTest` 与 `scrollY` 一致

**Files:**

- Modify: `packages/core/src/input/hit-test.ts`
- Modify: `packages/core/tests/input/hit-test.test.ts`

- [ ] **Step 1:** 在 **`hitTestRecursive`** 中，**`Text` 提前返回**之后、**`ordered` 子循环**之前，若 **`node.type === "ScrollView"`**：  
       计算 **`const scrollY = (node as ScrollViewNode).scrollY`**；  
       **`const worldForScrollChildren = canvasKit.Matrix.multiply(world, canvasKit.Matrix.translated(0, -scrollY))`**；  
       子循环改为 **`hitTestRecursive(c, pageX, pageY, canvasKit, worldForScrollChildren)`**。

- [ ] **Step 2:** **`localPointHitsNodeBounds`**：ScrollView 仍只在 **视口** `[0,w)×[0,h)`（及圆角）内可命中子节点；**不**把 `scrollY` 加进 bounds（与 paint clip 一致）。

- [ ] **Step 3:** 单元测试：构造 **小场景树** `ScrollView` → 子 **`View`**，手工 **`layout`**，**`scrollY > 0`**，断言 **`pageY`** 落在 **视口内可见区域** 时命中 **子节点** 的 **正确局部坐标**（可比 **无滚动时同一逻辑点的等价 `pageY + scrollY`** 思路写断言）。

- [ ] **Step 4:** Run: `vp test packages/core/tests/input/hit-test.test.ts`  
       Expected: PASS

- [ ] **Step 5:** Commit:

```bash
git add packages/core/src/input/hit-test.ts packages/core/tests/input/hit-test.test.ts
git commit -m "feat(core): hit-test ScrollView scroll offset"
```

---

### Task 4: React — `ScrollView` 宿主与 HostConfig

**Files:**

- Create: `packages/react/src/hosts/scroll-view.tsx`
- Modify: `packages/react/src/reconciler/host-config.ts`
- Modify: `packages/react/src/index.ts`
- Modify: `packages/react/src/jsx-augment.d.ts`（若存在）

- [ ] **Step 1:** **`scroll-view.tsx`**：

```tsx
import type { ScrollViewNode, ViewStyle } from "@react-canvas/core";
import type { ReactNode } from "react";

export type ScrollViewProps = {
  style?: ViewStyle;
  horizontal?: boolean;
  children?: ReactNode;
};

export const ScrollView = "ScrollView" as unknown as React.FC<ScrollViewProps>;
```

若项目 **`hosts/view.tsx`** 使用 **不同模式**（例如 **`forwardRef`**），则 **对齐同一风格**；**字符串宿主名**须与 **`createInstance` 的 `type ===`** 一致。

- [ ] **Step 2:** **`host-config.ts`**：
  - 顶部 **`import { ScrollView } from "../hosts/scroll-view.tsx"`**（路径以实际为准）；
  - **`createInstance`**：`if (type === ScrollView) { const node = new ScrollViewNode(yoga); node.setStyle(props.style ?? {}); ... return node; }`
  - **`commitUpdate`**：对 **`instance.type === "ScrollView"`** 调 **`setStyle`** / 交互，与 **`View`** 并列。

- [ ] **Step 3:** **`packages/react/src/index.ts`** 导出 **`ScrollView`**。

- [ ] **Step 4:** Run: `vp check`  
       Expected: PASS

- [ ] **Step 5:** Commit:

```bash
git add packages/react/src/hosts/scroll-view.tsx packages/react/src/reconciler/host-config.ts packages/react/src/index.ts
git commit -m "feat(react): ScrollView host and reconciler"
```

---

### Task 5: React — 指针拖拽与滚轮更新 `scrollY`

**Files:**

- Modify: `packages/react/src/input/canvas-pointer.ts`
- Modify: `packages/react/src/canvas/canvas.tsx`（若需传入 **queue paint** 闭包）

- [ ] **Step 1:** **`import { ScrollViewNode } from "@react-canvas/core"`**（或从 **`@react-canvas/core`** 已导出符号）。

- [ ] **Step 2:** **拖拽**：
  - `Map<pointerId, { scrollNode: ScrollViewNode; lastPageY: number }>`（仅当 **down 命中链** 上最深 **`ScrollView`** 时录入；**若子 `View` 有 `onPointerDown` 需否抢滚动**——V1：**命中 `ScrollView` 内任意子** 时仍允许滚动，或 **仅当命中 `ScrollView` 自身空白**——规格 **V1 推荐**：**在 `ScrollView` 视口内 pointerdown** 即 **捕获滚动**，与 RN 常见行为一致；实现：**down 时 `hitTest` 找 `ScrollView` 祖先**（自 **`target`** 沿 **`parent`** 上至根，**首个 `type === "ScrollView"`**）。
  - **`pointermove`**：`delta = pageY - lastPageY`；**`scrollY -= delta`**（手指下移内容下移：`scrollY` 增加方向与 **滚轮** 一致即可，**与验收自测**）；**`lastPageY = pageY`**；**`clamp`** 调 **`clampScrollOffsetsAfterLayout`** 或内联 **`max`**；**`queueLayoutPaintFrame(...)`**（与 **`resetAfterCommit`** 同一 **`frameRef`** 来源——需 **从 `canvas.tsx` 注入** **`requestPaint: () => void`** 或 **import `queueLayoutPaintFrame` + surface 引用**，以现有 **`attachCanvasPointerHandlers`** 签名扩展 **`paintFrameRef`**）。

- [ ] **Step 3:** **`wheel`**：**`canvas.addEventListener("wheel", onWheel, { passive: false })`**；**`onWheel`**：**`hitTest`** → 找 **`ScrollView` 祖先** → 更新 **`scrollY`** → **`preventDefault()`** → **`queueLayoutPaintFrame`**。

- [ ] **Step 4:** **`attachCanvasPointerHandlers` 签名** 增加参数 **`requestLayoutPaint: () => void`**（或 **`PaintFrameRef`**），**`canvas.tsx`** 传入 **`() => { if (surface && canvasKit && sceneRoot) queueLayoutPaintFrame(...) }`**。

- [ ] **Step 5:** Run: `vp check` + `vp test`  
       Expected: PASS

- [ ] **Step 6:** Commit:

```bash
git add packages/react/src/input/canvas-pointer.ts packages/react/src/canvas/canvas.tsx
git commit -m "feat(react): ScrollView pointer drag and wheel"
```

---

### Task 6: 文档与路线图

**Files:**

- Modify: `docs/development-roadmap.md`（Step 9 行）
- 可选：`apps/website` 新增 **ScrollView** 示例页或 **Playground**

- [ ] **Step 1:** 用户文档片段：**`horizontal`** V1 **未实现**。

- [ ] **Step 2:** Commit:

```bash
git add docs/development-roadmap.md
git commit -m "docs: mark Step 9 ScrollView progress"
```

---

## Spec 覆盖自检

| 规格章节                     | 对应 Task                              |
| ---------------------------- | -------------------------------------- |
| 目标：偏移 + clip + 命中一致 | Task 2、3                              |
| 布局边界与钳制               | Task 1                                 |
| React：宿主 + 指针/滚轮      | Task 4、5                              |
| V1 非目标（惯性/嵌套）       | 本计划未列实现任务                     |
| 验收：列表可滚、点击一致     | Task 5 + 手动跑 website（可选 Task 6） |

## 占位扫描

本计划 **无** TBD/TODO 步骤；**Yoga `Overflow.Scroll`** 若与当前 **默认 `Visible`** 冲突，以 **ScrollViewNode 构造后显式设置** 为准（见 Task 1）。

## 执行交接

**Plan 已保存至 `docs/superpowers/plans/2026-04-06-step-9-scrollview-implementation.md`。两种执行方式：**

1. **Subagent-Driven（推荐）** — 每 Task 派生子代理，Task 间人工复核，迭代快。
2. **Inline Execution** — 本会话内按 Task 顺序执行，配合 executing-plans 的检查点。

**你希望采用哪一种？**（若自行实现，可直接从 **Task 1** 勾选开始。）
