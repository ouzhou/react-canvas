# V2 可插拔渲染（DOM 调试 + Skia 占位）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `SceneRuntime` 上增加布局提交订阅与 `LayoutCommitPayload`，在 `react-v2` 提供基于订阅的 DOM 调试叠加层并可选挂到 `CanvasRuntime`，导出 Skia 占位工厂；`apps/v2` 用新组件替换轮询式 `LayoutPreview`。

**Architecture:** `core-v2` 在每次内部 `runLayout()` 完成后 **同步** 通知监听者，并传入 **只读** `LayoutCommitPayload`（viewport、rootId、scene、layout），避免监听方自行拉快照产生竞态。`subscribeAfterLayout` 注册时 **立即回调一帧当前载荷**（若已有布局），避免 React 首帧空白。`react-v2` 的 `DebugDomLayer` 用 `useState` 存最后一帧，样式与现 `apps/v2/src/layout-preview.tsx` 对齐（框线、`pointer-events: none`）。Skia 为 **独立 stub 模块**，`createSkiaSceneRenderer` 在 dev 下 `console.warn` 一次后返回可 `dispose` 的空对象。

**Tech Stack:** TypeScript、React 19、Vite+（`vp test` / `vp check`）、`vite-plus/test`。

**规格依据：** [`docs/superpowers/specs/2026-04-10-v2-renderers-design.md`](../specs/2026-04-10-v2-renderers-design.md)。

---

## 文件与职责总览（落地前锁定边界）

| 路径                                                     | 职责                                                                                                                                                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/core-v2/src/runtime/scene-runtime.ts`          | 新增 `LayoutCommitPayload` 类型、`subscribeAfterLayout`；从 `getLayoutSnapshot` 抽出 **不调用** `runLayout` 的布局快照构建函数供 payload 与 getter 复用；在 `runLayout()` 末尾调用 `notifyLayoutCommit()`；`subscribe` 注册时 **同步派发当前 payload** |
| `packages/core-v2/src/index.ts`                          | 导出 `LayoutCommitPayload`、`SceneRuntime` 上新增方法类型                                                                                                                                                                                              |
| `packages/core-v2/tests/layout-commit-subscribe.test.ts` | 订阅计数、insert 后触发、立即派发一帧                                                                                                                                                                                                                  |
| `packages/react-v2/src/debug-dom-layer.tsx`              | `DebugDomLayer`：订阅 `runtime`，渲染绝对定位调试盒（可从 `layout-preview.tsx` 抽取 hue/样式逻辑）                                                                                                                                                     |
| `packages/react-v2/src/canvas-runtime.tsx`               | 可选 `debugOverlay?: boolean`；为 `true` 时用 `position: relative` + 固定 `width`/`height` 包裹 Provider，并在子树之上渲染 `DebugDomLayer`                                                                                                             |
| `packages/react-v2/src/render/skia-renderer.stub.ts`     | `SkiaSceneRenderer` 类型 + `createSkiaSceneRenderer` stub                                                                                                                                                                                              |
| `packages/react-v2/src/index.ts`                         | 导出 `DebugDomLayer`、`DebugDomLayerProps`（若有）、`createSkiaSceneRenderer`、`SkiaSceneRenderer`、`CanvasRuntimeProps` 增量                                                                                                                          |
| `packages/react-v2/tests/debug-dom-layer.test.tsx`       | 挂载 `CanvasRuntime debugOverlay` + `View`，断言存在带 `title` 的调试盒节点（或快照字符串包含 `view-`）                                                                                                                                                |
| `apps/v2/src/react-smoke.tsx`                            | 使用 `CanvasRuntime debugOverlay`，删除对 `LayoutPreview` 的引用与外层手动画布（若与 `CanvasRuntime` 包装重复则简化）                                                                                                                                  |
| `apps/v2/src/core-smoke.tsx`                             | 使用 `DebugDomLayer`（来自 `react-v2`），删除 `LayoutPreview`                                                                                                                                                                                          |
| `apps/v2/src/layout-preview.tsx`                         | **删除**（逻辑迁移至 `DebugDomLayer` 后无引用）                                                                                                                                                                                                        |

---

## Task 1：`core-v2` — `LayoutCommitPayload` + `subscribeAfterLayout` + 通知

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`
- Modify: `packages/core-v2/src/index.ts`

- [ ] **Step 1：编写失败测试**

创建 `packages/core-v2/tests/layout-commit-subscribe.test.ts`：

```ts
import { expect, test } from "vite-plus/test";
import { createSceneRuntime } from "../src/runtime/scene-runtime.ts";

test("subscribeAfterLayout fires after insertView and on subscribe", async () => {
  const rt = await createSceneRuntime({ width: 100, height: 100 });
  let count = 0;
  const off = rt.subscribeAfterLayout(() => {
    count += 1;
  });
  expect(count).toBeGreaterThanOrEqual(1);
  const root = rt.getRootId();
  rt.insertView(root, "a", { width: 10, height: 10 });
  expect(count).toBeGreaterThanOrEqual(2);
  off();
  rt.insertView(root, "b", { width: 10, height: 10 });
  expect(count).toBeGreaterThanOrEqual(2);
});
```

- [ ] **Step 2：运行测试，确认失败**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2/tests/layout-commit-subscribe.test.ts
```

Expected: FAIL（`subscribeAfterLayout` 不存在或计数不对）。

- [ ] **Step 3：实现类型与运行时逻辑**

在 `scene-runtime.ts`：

1. 新增导出类型：

```ts
export type LayoutCommitPayload = {
  viewport: { width: number; height: number };
  rootId: string;
  scene: SceneGraphSnapshot;
  layout: LayoutSnapshot;
};
```

2. 将 `SceneRuntime` 接口扩展为：

```ts
subscribeAfterLayout(listener: (payload: LayoutCommitPayload) => void): () => void;
```

3. 在 `createSceneRuntime` 闭包内新增：

```ts
const layoutListeners = new Set<(payload: LayoutCommitPayload) => void>();

function buildLayoutSnapshotWithoutRun(): LayoutSnapshot {
  const out: LayoutSnapshot = {};
  for (const id of store.getIds()) {
    const n = store.get(id)!;
    const l = n.layout;
    const abs = absoluteBoundsFor(id, store);
    if (!l || !abs) continue;
    out[id] = {
      left: l.left,
      top: l.top,
      width: l.width,
      height: l.height,
      absLeft: abs.left,
      absTop: abs.top,
    };
  }
  return out;
}

function buildSceneGraphSnapshot(): SceneGraphSnapshot {
  const nodes: SceneGraphSnapshot["nodes"] = {};
  for (const id of store.getIds()) {
    const n = store.get(id)!;
    const entry: SceneGraphSnapshot["nodes"][string] = {
      parentId: n.parentId,
      children: [...n.children],
    };
    if (n.label !== undefined) entry.label = n.label;
    nodes[id] = entry;
  }
  return { rootId, nodes };
}

function emitLayoutCommit(): void {
  const payload: LayoutCommitPayload = {
    viewport: { width: options.width, height: options.height },
    rootId,
    scene: buildSceneGraphSnapshot(),
    layout: buildLayoutSnapshotWithoutRun(),
  };
  for (const fn of layoutListeners) {
    fn(payload);
  }
}
```

4. 将现有 `getLayoutSnapshot` 改为：`runLayout(); return buildLayoutSnapshotWithoutRun();`（保持对外行为：先同步布局再读）。

5. 在 **每次** `runLayout()` 函数体 **末尾** 调用 `emitLayoutCommit()`（含构造函数中首次 `runLayout()`）。

6. 实现 `subscribeAfterLayout(listener)`：

```ts
layoutListeners.add(listener);
emitLayoutCommit();
return () => {
  layoutListeners.delete(listener);
};
```

7. `insertView` / `removeView` / `updateStyle` 已调用 `runLayout()`，无需额外改动（除 `runLayout` 末尾 emit）。

8. 将对外方法 `getSceneGraphSnapshot()` 的实现改为 **`return buildSceneGraphSnapshot();`**，与 `emitLayoutCommit` 共用同一构建函数。

注意：`getSceneGraphSnapshot` 原有内联循环由 `buildSceneGraphSnapshot` 替代。

- [ ] **Step 4：导出**

在 `packages/core-v2/src/index.ts` 增加：

```ts
export type { LayoutCommitPayload } from "./runtime/scene-runtime.ts";
```

（若 `SceneRuntime` 为 re-export，确保类型含 `subscribeAfterLayout`。）

- [ ] **Step 5：运行测试**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2/tests/layout-commit-subscribe.test.ts
```

Expected: PASS。

- [ ] **Step 6：全量 core-v2 测试**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2
```

Expected: 全部通过。

- [ ] **Step 7：`vp check`**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp check
```

Expected: 通过。

- [ ] **Step 8：Commit**

```bash
git add packages/core-v2/src/runtime/scene-runtime.ts packages/core-v2/src/index.ts packages/core-v2/tests/layout-commit-subscribe.test.ts
git commit -m "feat(core-v2): layout commit payload and subscribeAfterLayout"
```

---

## Task 2：`react-v2` — `DebugDomLayer` + `CanvasRuntime` 可选调试叠加

**Files:**

- Create: `packages/react-v2/src/debug-dom-layer.tsx`
- Modify: `packages/react-v2/src/canvas-runtime.tsx`
- Modify: `packages/react-v2/src/index.ts`

- [ ] **Step 1：创建 `debug-dom-layer.tsx`**

从 `apps/v2/src/layout-preview.tsx` 复制 **hue 哈希**、**每个节点一个绝对定位 div + 标签 span** 的结构；数据源改为 `LayoutCommitPayload` 的 `layout` + `scene`（entries 用 `Object.entries(layout).sort`）；用 `subscribeAfterLayout` 更新 `useState<LayoutCommitPayload | null>`。

容器样式要点：

```ts
style={{
  position: "absolute",
  inset: 0,
  zIndex: 1,
  pointerEvents: "none",
  overflow: "hidden",
}}
```

`useLayoutEffect` 中：`const unsub = runtime.subscribeAfterLayout(setPayload); return unsub;`，依赖 `[runtime]`。

- [ ] **Step 2：扩展 `CanvasRuntimeProps`**

```ts
export type CanvasRuntimeProps = {
  width: number;
  height: number;
  debugOverlay?: boolean;
  children?: ReactNode;
};
```

当 `debugOverlay === true` 时：

```tsx
<div style={{ position: "relative", width, height }}>
  <SceneRuntimeContext.Provider value={runtime}>
    <ParentSceneIdContext.Provider value={runtime.getRootId()}>
      {children}
    </ParentSceneIdContext.Provider>
    <DebugDomLayer runtime={runtime} />
  </SceneRuntimeContext.Provider>
</div>
```

当 `false` 或未传时，保持 **现有** 仅 Provider、无包裹 `div` 的行为。

- [ ] **Step 3：导出**

在 `packages/react-v2/src/index.ts` 导出 `DebugDomLayer` 与 `LayoutCommitPayload`（若应用需要类型，可从 core re-export）。

- [ ] **Step 4：编写测试 `debug-dom-layer.test.tsx`**

```tsx
import type { SceneRuntime } from "@react-canvas/core-v2";
import { expect, test } from "vite-plus/test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { CanvasRuntime } from "../src/canvas-runtime.tsx";
import { View } from "../src/view.tsx";

test("debugOverlay renders titled overlay nodes for View ids", async () => {
  const el = document.createElement("div");
  const root = createRoot(el);
  await act(async () => {
    root.render(
      <CanvasRuntime width={200} height={200} debugOverlay>
        <View id="v-box" style={{ width: 50, height: 40 }} />
      </CanvasRuntime>,
    );
  });
  expect(el.innerHTML).toContain("v-box");
  root.unmount();
});
```

- [ ] **Step 5：运行测试**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp test packages/react-v2
```

Expected: PASS。

- [ ] **Step 6：`vp check`**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp check
```

- [ ] **Step 7：Commit**

```bash
git add packages/react-v2/src/debug-dom-layer.tsx packages/react-v2/src/canvas-runtime.tsx packages/react-v2/src/index.ts packages/react-v2/tests/debug-dom-layer.test.tsx
git commit -m "feat(react-v2): DebugDomLayer and CanvasRuntime debugOverlay"
```

---

## Task 3：`react-v2` — Skia 占位模块

**Files:**

- Create: `packages/react-v2/src/render/skia-renderer.stub.ts`
- Modify: `packages/react-v2/src/index.ts`

- [ ] **Step 1：创建 stub**

```ts
export type SkiaSceneRenderer = {
  dispose(): void;
};

export function createSkiaSceneRenderer(_options: {
  width: number;
  height: number;
}): SkiaSceneRenderer {
  if (import.meta.env.DEV) {
    console.warn("[@react-canvas/react-v2] Skia renderer is not implemented (stub).");
  }
  return {
    dispose() {},
  };
}
```

- [ ] **Step 2：导出** `createSkiaSceneRenderer`、`SkiaSceneRenderer`。

- [ ] **Step 3：`vp check` 与 Commit**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp check
git add packages/react-v2/src/render/skia-renderer.stub.ts packages/react-v2/src/index.ts
git commit -m "feat(react-v2): add Skia renderer stub"
```

---

## Task 4：`apps/v2` — 接入并删除 `layout-preview.tsx`

**Files:**

- Modify: `apps/v2/src/react-smoke.tsx`
- Modify: `apps/v2/src/core-smoke.tsx`
- Delete: `apps/v2/src/layout-preview.tsx`

- [ ] **Step 1：修改 `react-smoke.tsx`**

- 删除 `LayoutPreview` 的 import 与 `<LayoutPreview />`。
- 在 `<CanvasRuntime>` 上增加 `debugOverlay`。
- 若外层 `position: relative` 的定宽定高 `div` 与 `CanvasRuntime` 的包裹 **重复**，删除内层重复样式，仅保留一层边框/背景（以视觉不变为准）。

- [ ] **Step 2：修改 `core-smoke.tsx`**

- `import { DebugDomLayer } from "@react-canvas/react-v2"`。
- 在定宽定高容器内、`<PointerDebugPanel>` 旁，渲染 `<DebugDomLayer runtime={rt} />` 替代 `LayoutPreview`。

- [ ] **Step 3：删除** `apps/v2/src/layout-preview.tsx`。

- [ ] **Step 4：验证**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp check && vp test
```

Expected: 全部通过。

- [ ] **Step 5：Commit**

```bash
git add apps/v2/src/react-smoke.tsx apps/v2/src/core-smoke.tsx && git rm apps/v2/src/layout-preview.tsx
git commit -m "refactor(apps/v2): use DebugDomLayer and remove LayoutPreview"
```

---

## Spec coverage（自检）

| 规格章节                                          | 对应任务 |
| ------------------------------------------------- | -------- |
| §4 `subscribeAfterLayout` + `LayoutCommitPayload` | Task 1   |
| §5 DOM 调试叠加、`pointer-events: none`           | Task 2   |
| §6 Skia 占位 warn + dispose                       | Task 3   |
| §7 apps 去掉轮询                                  | Task 4   |

---

## Plan 自检（占位符与一致性）

- 已避免 TBD；`emitLayoutCommit` 内 `scene` 构建需与 `getSceneGraphSnapshot` **同一数据源**（Task 1 Step 3 中提取函数）。
- `SceneRuntime` 类型在 `index.ts` 与 `scene-runtime.ts` 保持一致导出。
- `subscribe` 立即派发一帧：Task 1 Step 3 与测试 Step 1 一致。

---

## Execution handoff

**计划已保存至：** `docs/superpowers/plans/2026-04-10-v2-renderers-implementation.md`。

**两种执行方式：**

1. **Subagent-Driven（推荐）** — 每个 Task 派生子代理执行，任务间人工/检查点复核，迭代快。需配合 **subagent-driven-development** 技能。

2. **Inline Execution** — 本会话内按 Task 顺序实现，配合 **executing-plans** 与检查点。

请选择一种方式后再开始改代码。
