# 阶段三（M3）：交互能力 Implementation Plan

> **For agentic workers:** 推荐按 **Task 顺序**执行；步骤使用 `- [ ]` 勾选。每完成一个 **Task** 建议 `git commit` 一次。验证统一用 **`vp`**（见根目录 `AGENTS.md`）。测试断言从 **`vite-plus/test`** 导入。

**Goal:** 在 **单 `<canvas>`** 上完成 **DOM 指针 → 逻辑坐标 → AABB 命中（与绘制层级一致）→ 场景树分发（捕获/冒泡、`stopPropagation`）→ 合成 `onClick`**；宿主 **`View` / `Text`**。满足 [2026-04-05-phase-3-interaction-design.md](../specs/2026-04-05-phase-3-interaction-design.md) 与 [development-roadmap.md](../../development-roadmap.md) 阶段三 Step 6。**Step 7 `Pressable` 本计划不列为必达**。

**Architecture:** **`@react-canvas/core`** 提供 **纯函数/无 React** 的命中、路径、分发与 `onClick` 状态机；**`@react-canvas/react`** 在 **`Canvas`** 上绑 DOM、做坐标换算，**HostConfig** 在 **commit** 路径把交互 props 写入 **`ViewNode` / `TextNode`**。传播 **不**走 ReactDOM；**不**新建第二棵业务树——只用现有 **场景宿主树**（与 Yoga 同构）。

**Tech Stack:** Pointer Events API、`devicePixelRatio`；与 [paint.ts](../../../packages/core/src/paint.ts) 的 **子节点遍历顺序**对齐命中「最上」层（见下）。

**绘制顺序 vs 命中顺序（须一致）：** `paintNode` 对 `node.children` **正序**递归，**后绘制的兄弟**在上层 → 命中同一父节点下重叠区域时，应 **自最后一个子节点向前**探测命中（或与 `paintNode` 共享「子访问顺序」常量，**反序**做 hit-test）。

**前置阅读:** [2026-04-05-phase-3-interaction-design.md](../specs/2026-04-05-phase-3-interaction-design.md)、[hostconfig-guide.md](../../hostconfig-guide.md)、`packages/core/src/paint.ts`、`packages/core/src/view-node.ts`。

---

## 文件结构（计划新增 / 大改）

| 路径                                                                  | 职责                                                                                                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/pointer-types.ts`（或并入现有）                    | 合成事件类型、`InteractionProps`（`onPointerDown` / `onPointerUp` / `onPointerMove` / `onClick` 等）。                                                    |
| `packages/core/src/world-bounds.ts`（名称可调整）                     | 由 `layout` 与祖先偏移计算 **逻辑坐标系**下的世界 AABB（与 paint 累加方式一致，可抽公共函数供 paint 与 hit 复用以避免漂移）。                             |
| `packages/core/src/hit-test.ts`                                       | `hitTest(sceneRoot, x, y): SceneNode \| null` 或返回 **最深命中** + **从根到 target 的 path**；跳过 `display: 'none'`；**Text 整框**；兄弟 **反序**优先。 |
| `packages/core/src/pointer-dispatch.ts`                               | `dispatch(path, type, event)`：捕获 + 冒泡、`currentTarget` / `target`、`stopPropagation()`。                                                             |
| `packages/core/src/click-activation.ts`（可合并）                     | 按 spec §7：`pointerId` 维度记录 down 位置、目标、up 时位移阈值，触发 **`onClick` 一次**。                                                                |
| `packages/core/src/view-node.ts` / `text-node.ts`                     | 存储 **交互回调**（或 `interaction: InteractionProps`）；`display: 'none'` 已存在则命中跳过。                                                             |
| `packages/core/src/index.ts`                                          | 导出命中/分发 API（按需）。                                                                                                                               |
| `packages/core/tests/hit-test.test.ts`、`pointer-dispatch.test.ts` 等 | 纯逻辑单测（可 mock layout）。                                                                                                                            |
| `packages/react/src/canvas.tsx`                                       | `ref` 到 canvas、注册 `pointer*`、坐标换算、调 core `hitTest` + `dispatch` + click 状态机。                                                               |
| `packages/react/src/view.ts`、`text.ts`                               | props 类型增加交互字段。                                                                                                                                  |
| `packages/react/src/reconciler-config.ts`                             | `commitUpdate` / `createInstance` 写入交互 props。                                                                                                        |
| `packages/react/src/jsx-augment.d.ts`                                 | `View` / `Text` 交互 props。                                                                                                                              |
| `packages/react/tests/pointer-*.test.tsx`                             | 集成测试（需 DOM 或 happy-dom 环境则按项目现状）。                                                                                                        |
| `apps/website/`                                                       | 可选：可点击 demo 页（替换静态 Button playground 或新增）。                                                                                               |

---

### Task 1: Core — 世界坐标与 AABB 命中

**Files:**

- Create: `packages/core/src/world-bounds.ts`（或与 `hit-test.ts` 合并）
- Create: `packages/core/src/hit-test.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tests/hit-test.test.ts`

- [ ] **Step 1:** 实现 `getWorldBounds(node, rootOffsetX, rootOffsetY)` 或自顶向下 DFS 携带累计偏移，使 **点 (x,y)** 与 `ViewNode.layout` 使用 **同一逻辑坐标系**（与 `paintNode` 中 `offsetX + layout.left` 一致）。

- [ ] **Step 2:** 实现 `hitTest(root: ViewNode, x: number, y: number): HitResult`，其中 `HitResult` 至少含 **`target: SceneNode`** 与 **`path: SceneNode[]`**（根 → … → target）。对 **子节点** 遍历顺序与 **`paintNode` 相反**（见上文），保证 **最上** 者胜；`isDisplayNone` 跳过；`TextNode` 与 `ViewNode` 同 AABB 规则。

- [ ] **Step 3:** 单元测试：构造简单树 + **手工设 `layout`**，断言命中顺序与重叠行为（无需 CanvasKit）。

- [ ] **Step 4:** `vp check` + `vp test`。

- [ ] **Step 5:** Commit：`feat(core): hit testing with paint order`

---

### Task 2: Core — 合成事件与冒泡 / 捕获 / `stopPropagation`

**Files:**

- Create: `packages/core/src/pointer-types.ts`
- Create: `packages/core/src/pointer-dispatch.ts`
- Modify: `packages/core/src/view-node.ts`（及 `TextNode` 若需显式字段）
- Create: `packages/core/tests/pointer-dispatch.test.ts`

- [ ] **Step 1:** 定义 `createSyntheticPointerEvent(...)`：`target`、`currentTarget`、`stopPropagation()`、**`defaultPrevented`**（预留）、`locationX/Y`（相对 `currentTarget`）、`pageX/Y`（相对 canvas 逻辑原点）。

- [ ] **Step 2:** 实现 `dispatchPointerEvent(path, phase, type, event)`：**先捕获**（根→叶）再 **冒泡**（叶→根），或按 spec 固定顺序；**v1 可仅冒泡**以减小工作量——若砍捕获，须在本文件与 **design spec** 中同步标注。

- [ ] **Step 3:** 在 `ViewNode`（基类即可，`TextNode` 继承）增加 **`interaction`** 或平铺字段，存储 `onPointerDown` 等 **函数引用**；`commitUpdate` 由 react 包写入（Task 4）。

- [ ] **Step 4:** 单测：`stopPropagation` 后同级后续监听器不执行；`currentTarget` 逐节点正确。

- [ ] **Step 5:** `vp check` + `vp test`。

- [ ] **Step 6:** Commit：`feat(core): pointer event dispatch`

---

### Task 3: Core — `onClick` 激活状态机

**Files:**

- Create: `packages/core/src/click-activation.ts`（或并入 `pointer-dispatch.ts`）
- Modify: `packages/core/tests/` 增加用例

- [ ] **Step 1:** 以 **`pointerId`** 为 key 维护：down 时 **命中 target**、**pageX/Y**；move/up 时更新；up 时若位移 **小于阈值**（spec 缺省，如 10 logical px）且 **目标策略与 spec §7 一致**（推荐 up 在框外不触发），则对 **目标路径** 派发 **`type: 'click'`** 或调用 `onClick`（二选一，与事件对象设计一致）。

- [ ] **Step 2:** 单测：纯函数级 mock，覆盖移动过大、cancel、多 pointer。

- [ ] **Step 3:** `vp check` + `vp test`。

- [ ] **Step 4:** Commit：`feat(core): onClick activation`

---

### Task 4: React — DOM 监听与坐标换算

**Files:**

- Modify: `packages/react/src/canvas.tsx`
- Create（可选）: `packages/react/src/canvas-pointer.ts`

- [ ] **Step 1:** 在 `useLayoutEffect` 中于 **`<canvas>`** 上 `addEventListener('pointerdown'|...)`，`passive` 视需要；cleanup 移除。

- [ ] **Step 2:** `clientX/clientY` → canvas **逻辑坐标**：用 `canvas.getBoundingClientRect()` + `width`/`height` props 与 **DPR** 关系，与 **现有绘制** 使用的逻辑宽高一致（避免命中与像素错位）。

- [ ] **Step 3:** （可选）`pointerup`/`pointermove` 在 **document** 上监听，处理 **移出画布仍按住**（spec DOM 适配层）。

- [ ] **Step 4:** 将事件转交 core：`hitTest` → `dispatch` → click 状态机；**禁止**在 render 中改场景树。

- [ ] **Step 5:** `vp check`。

- [ ] **Step 6:** Commit：`feat(react): canvas pointer wiring`

---

### Task 5: React — HostConfig 与 `View` / `Text` props

**Files:**

- Modify: `packages/react/src/reconciler-config.ts`
- Modify: `packages/react/src/view.ts`、`text.ts`
- Modify: `packages/react/src/jsx-augment.d.ts`

- [ ] **Step 1:** `ViewProps` / `TextProps` 增加交互可选字段；`prepareUpdate` / `commitUpdate` 将变更写入 **场景节点** 上存储的回调。

- [ ] **Step 2:** `vp check` + 现有测试全绿。

- [ ] **Step 3:** Commit：`feat(react): pointer props on View and Text`

---

### Task 6: React — 集成测试与文档

**Files:**

- Create: `packages/react/tests/pointer-click.test.tsx`（或 `canvas-pointer.test.tsx`）
- Modify: `docs/development-roadmap.md`（勾选或指向本计划完成状态，可选）

- [ ] **Step 1:** 集成测试：挂载 `CanvasProvider` + `Canvas` + 可点 `View`，**模拟 pointer 序列**（若环境无真实布局，可配合 **固定 layout** 的测试桩——以可维护为准）。

- [ ] **Step 2:** 用户文档片段：说明 **非 DOM 冒泡**、与 RN `onPress` 对应 **`onClick`**。

- [ ] **Step 3:** `vp test` + `vp check`。

- [ ] **Step 4:** Commit：`test(react): pointer and onClick integration`

---

### Task 7（可选）: Website — 可交互 Playground

**Files:**

- `apps/website/src/components/...`、`content/docs/playground/...`、`astro.config.mjs`

- [ ] **Step 1:** 最小 demo：`onClick` 改 **React state**（数字 +1）或切换背景，证明端到端可用。

- [ ] **Step 2:** `vp check`（全仓库）。

- [ ] **Step 3:** Commit：`feat(website): interactive pointer playground`

---

## 验收（M3）

- 与设计 spec §10、`development-roadmap` 阶段三 **验收代码** 一致：`<View ... onClick={...} />` 可触发。
- `vp check` 与 `vp test` 通过。

---

## 相关文档

- [2026-04-05-phase-3-interaction-design.md](../specs/2026-04-05-phase-3-interaction-design.md)
- [development-roadmap.md](../../development-roadmap.md)
