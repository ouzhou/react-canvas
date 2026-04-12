# ScrollView（core-v2 + react-v2）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在画布场景树内实现 RN 式 **纵向 ScrollView**：`scrollY`、滚轮（策略 B）、拖拽滚动、裁剪内绘制平移、命中逆变换、布局后 `maxScrollY` 钳制；导出 `react-v2` 的 `<ScrollView>`；在 `apps/v3` 的 `react-smoke` 主栏用其包裹可变高内容。

**Architecture:** `SceneNode` 增加 `kind: "scrollView"` 与 `scrollY`；`SceneRuntime` 提供 `insertScrollView` / `addScrollY`（或 `setScrollY`）；仅偏移时 **`emitLayoutCommit()`** 不重跑 Yoga（在 `buildLayoutSnapshotWithoutRun` 中写入 `layout[id].scrollY`）；Skia `paintNodeContent` 在绘制 scroll 子树前 `translate(0, -scrollY)`；`hitTestAt` 在 scroll 视口内对子递归使用 **内容坐标**；`canvas-stage-pointer` 增加 **`wheel`（passive: true）** → `dispatchWheel`；指针拖拽滚动用 runtime 内 **小状态机**（阈值后进入 drag，抑制 click）与 `dispatchPointerPipeline` 协同。

**Tech Stack:** TypeScript, Yoga（`yoga-layout/load`）, Vitest（`vite-plus/test`）, `@lingui` 无关；遵守 `vp test` / `vp check`。

**规格来源:** [2026-04-12-scrollview-core-v2-design.md](../specs/2026-04-12-scrollview-core-v2-design.md)

---

## File map（创建 / 修改）

| 路径 | 职责 |
|------|------|
| `packages/core-v2/src/scene/scene-node.ts` | `SceneNodeKind` 含 `"scrollView"`；`SceneNode.scrollY` |
| `packages/core-v2/src/runtime/scene-runtime.ts` | `insertScrollView`、`addScrollY`/`setScrollY`、`dispatchWheel`、拖拽状态、`emitLayoutCommit` 无 Yoga 路径、`LayoutSnapshot` 增加 `scrollY?` |
| `packages/core-v2/src/runtime/node-store.ts` | `rebuildYogaStyle`：`scrollView` 走与 `view` 相同 Yoga 路径（不测 `measureFunc`） |
| `packages/core-v2/src/hit/hit-test.ts` | scroll 视口裁剪 + 子树坐标 `+scrollY`（与 paint 互逆） |
| `packages/core-v2/src/render/scene-skia-presenter.ts` | `nodeKind === "scrollView"` 时在子 `paintSubtree` 前 `translate(0, -scrollY)`（`scrollY` 来自 `commit.layout[id].scrollY`） |
| `packages/core-v2/src/input/canvas-stage-pointer.ts` | `wheel` → `runtime.dispatchWheel(...)`，`passive: true` |
| `packages/core-v2/src/index.ts` | 导出新增类型 / API（若需） |
| `packages/core-v2/tests/scroll-view-hit.test.ts`（新建） | 命中 + `scrollY` |
| `packages/core-v2/tests/scroll-view-layout.test.ts`（新建，可选合并） | `maxScrollY` 钳制与快照字段 |
| `packages/react-v2/src/scroll-view.tsx`（新建） | `ScrollView` 组件 |
| `packages/react-v2/src/index.ts` | `export { ScrollView }` |
| `packages/react-v2/tests/scroll-view.test.tsx`（新建） | 集成：滚轮或 `addScrollY` 后 click 命中 |
| `apps/v3/src/react-smoke.tsx` | 主栏文档区 + 控件 + `smoke-stage` 外包 `<ScrollView>`（固定顶栏外） |

---

### Task 1: 类型与快照字段

**Files:**

- Modify: `packages/core-v2/src/scene/scene-node.ts`
- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`（`LayoutSnapshot` 类型块约 L56–L84）

- [ ] **Step 1: 扩展类型**

在 `scene-node.ts`：

```ts
export type SceneNodeKind = "view" | "text" | "scrollView";
```

在 `SceneNode` 上增加（`scrollView` 专用，其它 kind 省略即可）：

```ts
/** 仅 `kind === "scrollView"`；其余 kind 视为 0 */
scrollY?: number;
```

在 `scene-runtime.ts` 的 `LayoutSnapshot` 条目类型中增加：

```ts
/** 仅 scrollView；绘制与调试用 */
scrollY?: number;
```

- [ ] **Step 2: `buildLayoutSnapshotWithoutRun` 写入 `scrollY`**

在写入 `entry.nodeKind` 之后，若 `nk === "scrollView"`，则：

```ts
entry.scrollY = typeof n.scrollY === "number" && Number.isFinite(n.scrollY) ? n.scrollY : 0;
```

- [ ] **Step 3: 运行类型检查**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp check
```

Expected: 无新增 TS 错误（若 v3 lingui 仍失败，与本次无关可用 `--no-verify` 仅验 packages，或先修 lingui 声明）。

- [ ] **Step 4: Commit**

```bash
git add packages/core-v2/src/scene/scene-node.ts packages/core-v2/src/runtime/scene-runtime.ts
git commit -m "feat(core-v2): scrollView kind and layout snapshot scrollY field"
```

---

### Task 2: `insertScrollView` + 仅重发 layout commit

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`

- [ ] **Step 1: 写失败测试（runtime 行为）**

新建 `packages/core-v2/tests/scroll-view-runtime.test.ts`：

```ts
import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("insertScrollView creates node and addScrollY emits layout without throwing", async () => {
  const rt = await createSceneRuntime({ width: 200, height: 200 });
  const root = rt.getContentRootId();
  rt.insertScrollView?.(root, "sv", { width: 200, height: 100, overflow: "hidden" });
  // 若 API 尚未实现，本步预期 FAIL
  rt.insertView("sv", "inner", { height: 300 });
  rt.addScrollY?.("sv", 10);
  const lay = rt.getLayoutSnapshot();
  expect(lay.sv?.scrollY).toBe(10);
});
```

将 `insertScrollView` / `addScrollY` 方法名与实现一致后调整测试。

- [ ] **Step 2: 运行测试确认 FAIL**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2/tests/scroll-view-runtime.test.ts
```

Expected: FAIL（方法不存在或未写入 scrollY）。

- [ ] **Step 3: 实现 `insertScrollView`**

在 `createSceneRuntime` 内 `apiRef` 旁实现（示意逻辑）：

1. `insertScrollView(parentId, id, style)`：`createChildAt` → `kind = "scrollView"`，`scrollY = 0`，`viewStyle = { overflow: "hidden", ...style }`（用户 `overflow` 可覆盖但文档推荐 hidden），`rebuildYogaStyle`，`runLayout()`，`applyResolvedCursor()`（与 `insertView` 对齐）。
2. `SceneRuntime` 类型上增加方法签名。

- [ ] **Step 4: 实现 `addScrollY(id, delta)`**

1. 读 `store.get(id)`，若非 `scrollView` 则 return。
2. `scrollY = clamp(scrollY + delta, 0, maxScrollY(id))`，其中：

```ts
function maxScrollY(store, scrollId: string): number {
  const sv = store.get(scrollId);
  if (!sv || sv.children.length < 1) return 0;
  const inner = store.get(sv.children[0]!);
  const svH = sv.layout?.height ?? 0;
  const innerH = inner?.layout?.height ?? 0;
  return Math.max(0, innerH - svH);
}
```

**注意：** 仅在 **`layoutDirty === false`** 且子已 layout 后调用；首次子节点挂载后由 `runLayout` 填充 `layout`。

3. **`layoutDirty` 不置 true**；调用 **`emitLayoutCommit()`** 仅刷新监听器（Skia 重绘）。若当前 `emitLayoutCommit` 仅在 `runLayout` 后调用，直接复用该函数。

- [ ] **Step 5: 运行测试 PASS**

```bash
vp test packages/core-v2/tests/scroll-view-runtime.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/core-v2/src/runtime/scene-runtime.ts packages/core-v2/tests/scroll-view-runtime.test.ts
git commit -m "feat(core-v2): insertScrollView and addScrollY with layout commit"
```

---

### Task 3: `hitTestAt` 与 scroll 坐标

**Files:**

- Modify: `packages/core-v2/src/hit/hit-test.ts`
- Modify: `packages/core-v2/tests/scroll-view-hit.test.ts`（或扩展现有 `scroll-view-runtime.test.ts`）

- [ ] **Step 1: 失败测试**

构造树：`scrollView` 100×80，`inner` 上放一 `View` `leaf` 在 inner 坐标 (0, 120) 处 40×40（总内容高 > 视口）。`scrollY=0` 时 Stage 点 `(10, 10)` 应命中 scroll 自身或 inner 的上方区域，**不应**命中 `leaf`；`scrollY=120` 时同一点应能命中 `leaf`（按你们绝对坐标定义调整数值，以 **视觉一致** 为准写断言）。

- [ ] **Step 2: 实现 `visit` 分支**

当 `node.kind === "scrollView"`：

1. `absoluteBoundsFor(id)` 判定点是否在视口；否 → return null。
2. 对 **每个子**（通常仅 inner），递归 `visit(child, stageX, stageY + scrollY)`（与规格 §3.2：`stageY + scrollY` 内容坐标一致；若 paint 使用 `translate(0, -scrollY)`，则逆变换为 **加上** `scrollY`）。

**禁止**在未变换坐标下对超出视口的子盒直接 `containsPoint` 命中。

- [ ] **Step 3: `vp test` 相关文件 PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(core-v2): hitTestAt respects scrollView scrollY"
```

---

### Task 4: Skia 绘制 `translate(0, -scrollY)`

**Files:**

- Modify: `packages/core-v2/src/render/scene-skia-presenter.ts`

- [ ] **Step 1: 在 `paintNodeContent` 末尾、遍历 `sceneNode.children` 之前**

读取 `box.scrollY ?? 0`（仅当 `box.nodeKind === "scrollView"` 且 `scrollY !== 0` 时可优化），对 **子树** 包裹：

```ts
if (box.nodeKind === "scrollView" && (box.scrollY ?? 0) !== 0) {
  const sy = box.scrollY ?? 0;
  skCanvas.save();
  skCanvas.translate(0, -sy);
  try {
    for (const childId of sceneNode.children) {
      paintSubtree(childId);
    }
  } finally {
    skCanvas.restore();
  }
  return;
}
// 原有 for 循环
for (const childId of sceneNode.children) {
  paintSubtree(childId);
}
```

确保与 **clip（`paintSubtree` 外层）** 顺序一致：clip 已 push 后，在 `paintNodeContent` 内 translate 仅影响子内容，**不**平移 scroll 节点自身背景（背景已在 `translate` 之前绘制完毕）。

- [ ] **Step 2: 手动或截图测试**（可选）：v3 跑 dev 看滚动后内容是否上移。

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(core-v2): paint scrollView children with vertical scroll offset"
```

---

### Task 5: `dispatchWheel` + `canvas-stage-pointer`

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`
- Modify: `packages/core-v2/src/input/canvas-stage-pointer.ts`
- Modify: `packages/core-v2/src/index.ts`（若导出）

- [ ] **Step 1: Runtime 增加 `dispatchWheel(ev: { x: number; y: number; deltaY: number }): void`**

1. `layoutDirty` 时先 `runLayout()`（与 pointer 一致）。
2. 自顶向下或复用辅助函数：**找到最深** 的 `scrollView`，使其视口包含 `(x,y)` 且 `maxScrollY>0`。
3. `addScrollY(id, deltaY)`（或按习惯取反：`addScrollY(id, -deltaY)`，与 macOS/Windows 自然方向对齐，在测试中固定期望）。
4. **不** `preventDefault`（策略 B；监听 passive true）。

- [ ] **Step 2: `attachCanvasStagePointer`**

```ts
const onWheel = (e: WheelEvent) => {
  const { x, y } = toStage(canvas, e.clientX, e.clientY);
  runtime.dispatchWheel({ x, y, deltaY: e.deltaY });
};
canvas.addEventListener("wheel", onWheel, { passive: true });
// teardown removeEventListener
```

- [ ] **Step 3: 测试**

在 `scroll-view-runtime.test.ts` 或新文件中 mock 调用 `dispatchWheel`，断言 `scrollY` 变化。

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(core-v2): dispatchWheel and canvas wheel listener (passive)"
```

---

### Task 6: 拖拽滚动 + click 抑制（阈值）

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`（`dispatchPointerPipeline` 附近）

- [ ] **Step 1: 状态字段（闭包内）**

```ts
type ScrollDragState =
  | { phase: "idle" }
  | {
      phase: "track" | "dragging";
      scrollId: string;
      pointerId: number;
      startX: number;
      startY: number;
      lastY: number;
      startScrollY: number;
    };
let scrollDrag: ScrollDragState = { phase: "idle" };
let suppressNextClick = false;
```

- [ ] **Step 2: `pointerdown`**

在已有 `hitTestAt` 得到 `nextLeaf` 后，求 **包含该 leaf 的最内层** `scrollView` 祖先 `S` 且 `maxScrollY(S)>0`。若存在，设 `scrollDrag = { phase: "track", scrollId: S.id, pointerId: ev.button??0, startX, startY, lastY: stageY, startScrollY: S.scrollY }`（需从 `store.get` 读 `scrollY`）。

- [ ] **Step 3: `pointermove`（button 按下时）**

若 `phase === "track"` 且 `|stageY - startY| > 5`（阈值常量），`phase = "dragging"`。若 `phase === "dragging"`：`delta = lastY - stageY`（手指下移 → 内容下移 → `scrollY` 增加，符号与测试一致），`lastY = stageY`，`addScrollY(scrollId, delta)`，`suppressNextClick = true`。此分支下 **可跳过** 对 `nextLeaf` 的 `pointermove` 冒泡（避免按钮误触）；**仍建议**更新 `lastHitTargetId` / cursor 以保持 hover 合理（按产品选择，计划中优先 **仍派发 move** 仅不派发 click——最小改动是 **仅 `click` 抑制**）。

- [ ] **Step 4: `pointerup` / `click`**

`pointerup` 将 `scrollDrag` 置 `idle`。若 `suppressNextClick`，在随后的 **合成 `click`** 路径中直接 return 空 trace 并清除 flag（需在 `dispatch` click 或 `pointerup` 后拦截，具体对齐当前 `canvas-stage-pointer` 的 click 派发顺序）。

- [ ] **Step 5: 测试**

程序化 `dispatchPointerLike(down)` → `move` 大位移 → `up` → `click`，断言 `scrollY` 变化且 **子按钮 onClick 未触发**（可注册 listener 计数）。

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(core-v2): scroll drag gesture with click suppression threshold"
```

---

### Task 7: `react-v2` `<ScrollView>`

**Files:**

- Create: `packages/react-v2/src/scroll-view.tsx`
- Modify: `packages/react-v2/src/index.ts`

- [ ] **Step 1: 组件骨架**

- `useSceneRuntime`、`ParentSceneIdContext`、`useId`。
- `scrollId = "scroll-" + useId().replace(/:/g, "")`，`contentId = scrollId + "-content"`。
- `useLayoutEffect`：`insertScrollView(parentId, scrollId, parsedStyle)`；`insertView(scrollId, contentId, { flexDirection: "column", alignSelf: "flex-start" })`（或经 Yoga 实测后调整，保证 **内容高度 = 子 intrinsic 总高**）。
- cleanup：`removeView(contentId)` 再 `removeView(scrollId)`（顺序与子依赖一致）。
- **第二**个 `useLayoutEffect`：`updateStyle(scrollId, parsedStyle)` 当 style 变。
- `return <ParentSceneIdContext.Provider value={contentId}>{children}</Provider>`。

- [ ] **Step 2: 集成测试** `packages/react-v2/tests/scroll-view.test.tsx`

`CanvasRuntime` + `GrabRuntime` + `ScrollView` 内高 `View` + 底部可点击 `View`，`act` 后调用 `captured!.addScrollY("scroll-...", 50)` 或直接 `dispatchWheel`，再 `dispatchPointerLike` click，断言命中 id。

- [ ] **Step 3: `vp test` + Commit**

```bash
git add packages/react-v2/src/scroll-view.tsx packages/react-v2/src/index.ts packages/react-v2/tests/scroll-view.test.tsx
git commit -m "feat(react-v2): ScrollView host and tests"
```

---

### Task 8: `apps/v3` `react-smoke` 接入

**Files:**

- Modify: `apps/v3/src/react-smoke.tsx`

- [ ] **Step 1: 导入 `ScrollView`**

- [ ] **Step 2: 在 `smoke-main` 内，将「顶栏 + rule」保留在 `ScrollView` 外；从 `smoke-doc-block`（或从文档标题行）到 `smoke-stage`（含）包进 `<ScrollView style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>`**

保持侧栏不变；`ScrollView` 父级为 `smoke-main` 的 column 且 **`minHeight: 0`** 已存在于 `smoke-main` 时，给 **ScrollView** 自身 `flex:1` `minHeight:0`。

- [ ] **Step 3: 手动验证**：切换中英文 + 滚轮 + 拖拽 + 点击 demo tab。

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(v3): wrap smoke main column in ScrollView"
```

---

## Spec self-review（计划 ↔ 规格）

| 规格 § | 覆盖 Task |
|--------|-----------|
| scrollView 节点 + scrollY | 1, 2 |
| 绘制 translate + clip | 4 |
| 命中逆变换 | 3 |
| maxScrollY 钳制 | 2 |
| wheel 策略 B passive | 5 |
| 拖拽滚动 | 6 |
| react ScrollView + 内容槽 | 7 |
| v3 smoke 包裹 | 8 |
| 非目标：惯性/嵌套/onScroll | 不在本计划列任务（YAGNI） |

**Placeholder 扫描：** 无 TBD；`addScrollY` / `insertScrollView` 名称以最终实现为准，各 Task 已写明代号调整处。

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-12-scrollview-implementation.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — 每个 Task 派生子代理，Task 间人工快速验收  
2. **Inline Execution** — 本会话内按 Task 顺序实现，关键点设检查点  

**Which approach do you want?**（直接回复 `1` 或 `2`；若自行开干，可按文件中 Checkbox 逐项勾选。）
