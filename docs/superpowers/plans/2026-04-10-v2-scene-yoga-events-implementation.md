# V2 SceneRuntime + Yoga + 事件管线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `packages/core-v2` 实现 `SceneRuntime`（Yoga 布局、Stage 坐标命中、捕获/冒泡、`stopPropagation`、三块快照），在 `packages/react-v2` 实现 `<CanvasRuntime>` 与 `<View>`，在 `apps/v2` 用程序化坐标派发与三块折叠 JSON 联调；不实现任何绘制。

**Architecture:** core 内聚场景树与 `yoga-layout/load` 异步初始化；布局变更后自动 `calculateLayout`，将各节点 `getComputedLayout()` 同步为 **相对父级** 的 `left/top/width/height`，再换算 **Stage 绝对包围盒** 供命中使用。命中对兄弟 **自最后一个子节点向前** 递归。事件分两遍：**capture** 沿 `root→target`，**bubble** 沿 `target→root`；`stopPropagation()` 中止后续所有监听。react 层用 **Context + 挂载时注册节点**（非 reconciler），避免首版引入 `react-reconciler` 复杂度。

**Tech Stack:** TypeScript、`yoga-layout@catalog`（与 v1 一致走 `yoga-layout/load`）、React 19（catalog）、Vite+（`vp test` / `vp check` / `vp pack`）、`vite-plus/test`。

**规格依据：** [`docs/superpowers/specs/2026-04-10-v2-scene-yoga-events-design.md`](../specs/2026-04-10-v2-scene-yoga-events-design.md)。

---

## 文件与职责总览（落地前锁定边界）

| 路径                                            | 职责                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `packages/core-v2/src/layout/yoga.ts`           | `loadYoga` 再导出（与 v1 `packages/core/src/layout/yoga.ts` 同模式）                                              |
| `packages/core-v2/src/scene/scene-node.ts`      | 场景节点：`id`、`parentId`、`children` id 列表、`yogaNode` 引用、`layout` 缓存                                    |
| `packages/core-v2/src/layout/style-map.ts`      | **Yoga 样式子集**：`width`/`height`/`flex`/`flexDirection`/`padding`/`margin` 等最小集合 → `YogaNode`             |
| `packages/core-v2/src/layout/layout-sync.ts`    | `calculateLayout` 后把 `getComputedLayout()` 写入节点；`absoluteBoundsFor(node)` 沿父链累加                       |
| `packages/core-v2/src/hit/hit-test.ts`          | `hitTestAt(stageX, stageY, rootId, store)`：兄弟自后向前，返回最深命中节点 id 或 `null`                           |
| `packages/core-v2/src/events/scene-event.ts`    | 事件对象类型：`type`、`x`、`y`、`targetId`、`currentTargetId`、`phase`、`stopPropagation()`                       |
| `packages/core-v2/src/events/dispatch.ts`       | `dispatchPointerLike`：hit → 构建 path → capture 遍历 → bubble 遍历；写入 `lastTrace`                             |
| `packages/core-v2/src/runtime/scene-runtime.ts` | `createSceneRuntime`、节点 CRUD、监听注册、`getSceneGraphSnapshot` / `getLayoutSnapshot` / `getLastDispatchTrace` |
| `packages/core-v2/src/index.ts`                 | 公共导出                                                                                                          |
| `packages/core-v2/tests/*.test.ts`              | 布局、命中、派发、快照（无 DOM）                                                                                  |
| `packages/react-v2/src/context.ts`              | `SceneRuntime` React context                                                                                      |
| `packages/react-v2/src/canvas-runtime.tsx`      | `<CanvasRuntime width height>`：创建 runtime、Provider                                                            |
| `packages/react-v2/src/view.tsx`                | `<View style onPointerDown onPointerUp onClick>`：注册/更新/卸载场景节点                                          |
| `packages/react-v2/src/hooks.ts`                | `useSceneRuntime()`、`useDispatchPointer()`（可选）                                                               |
| `packages/react-v2/src/index.ts`                | 公共导出                                                                                                          |
| `packages/react-v2/tests/*.test.ts`             | `@testing-library/react` 或 `react-dom/server` + 断言快照（择一，任务内定）                                       |
| `apps/v2/src/main.tsx`                          | `createRoot` 挂载演示                                                                                             |
| `apps/v2/src/App.tsx`                           | `CanvasRuntime` + 嵌套 `View` + 坐标输入 + 三块 `<details>` JSON                                                  |
| `apps/v2/package.json`                          | 依赖 `react`、`react-dom`、`@react-canvas/react-v2`、`@vitejs/plugin-react`（catalog）                            |

根 `package.json` 若尚无 `apps/v2` 的 workspace 脚本，不强制修改；以 `vp run v2#dev` 或进入 `apps/v2` 执行 `vp dev` 为准（任务内写死命令）。

---

## Task 1：core-v2 依赖与 Yoga 入口

**Files:**

- Modify: `packages/core-v2/package.json`
- Create: `packages/core-v2/src/layout/yoga.ts`

- [ ] **Step 1：为 `core-v2` 添加 `yoga-layout`**

在 `packages/core-v2/package.json` 的 `dependencies`（若无则新增）加入：

```json
"yoga-layout": "catalog:"
```

在仓库根执行：

```bash
cd /Users/zhouou/Desktop/react-canvas && vp install
```

Expected: lockfile 更新成功，无报错。

- [ ] **Step 2：创建 `yoga.ts`**

创建 `packages/core-v2/src/layout/yoga.ts`：

```ts
export { loadYoga, type Yoga } from "yoga-layout/load";
```

- [ ] **Step 3：`vp check`（仅 core-v2 包路径若支持）**

```bash
cd /Users/zhouou/Desktop/react-canvas/packages/core-v2 && vp check
```

Expected: 通过。

- [ ] **Step 4：Commit**

```bash
git add packages/core-v2/package.json packages/core-v2/src/layout/yoga.ts pnpm-lock.yaml
git commit -m "feat(core-v2): add yoga-layout dependency and load entry"
```

---

## Task 2：`SceneNode` 存储与 Yoga 树挂载

**Files:**

- Create: `packages/core-v2/src/scene/scene-node.ts`
- Create: `packages/core-v2/src/runtime/node-store.ts`
- Create: `packages/core-v2/tests/node-store.test.ts`

- [ ] **Step 1：编写失败测试 `node-store.test.ts`**

```ts
import { expect, test, beforeAll } from "vite-plus/test";
import { loadYoga } from "../src/layout/yoga.ts";
import type { Yoga } from "../src/layout/yoga.ts";
import { createNodeStore } from "../src/runtime/node-store.ts";

let yoga: Yoga;

beforeAll(async () => {
  yoga = await loadYoga();
});

test("append child links yoga tree and scene children ids", () => {
  const store = createNodeStore(yoga);
  const root = store.createRootNode(100, 100);
  const a = store.createNode("child-a");
  store.appendChild(root.id, a.id);
  expect(store.get(root.id)!.children).toEqual([a.id]);
  expect(a.yogaNode.getParent()).toBe(root.yogaNode);
});
```

运行：

```bash
cd /Users/zhouou/Desktop/react-canvas/packages/core-v2 && vp test tests/node-store.test.ts
```

Expected: FAIL（模块不存在或未导出）。

- [ ] **Step 2：实现 `scene-node.ts` 与 `node-store.ts`**

`SceneNode` 字段（示例，可按实现微调命名，但全计划需一致）：

- `id: string`
- `parentId: string | null`
- `children: string[]`
- `yogaNode`（Yoga 的 `Node` 类型，从 `Yoga` 实例创建）
- `layout: { left: number; top: number; width: number; height: number } | null`

`createNodeStore(yoga)` 提供：

- `createRootNode(width, height)`：创建根 `YogaNode`，`setWidth`/`setHeight` 为 PT 或同类单位（与 v1 一致用 `Unit` API，参照 `packages/core` 中根节点设置方式）
- `createNode(label?: string)`：新 flex 子节点
- `appendChild(parentId, childId)`：更新 `children`、调用 `yogaNode.insertChild`
- `removeNode(id)`：自父移除并 `yogaNode` 卸载

- [ ] **Step 3：再跑测试**

Expected: PASS。

- [ ] **Step 4：Commit**

```bash
git add packages/core-v2/src/scene/scene-node.ts packages/core-v2/src/runtime/node-store.ts packages/core-v2/tests/node-store.test.ts
git commit -m "feat(core-v2): scene node store and yoga tree"
```

---

## Task 3：样式子集与布局同步

**Files:**

- Create: `packages/core-v2/src/layout/style-map.ts`
- Create: `packages/core-v2/src/layout/layout-sync.ts`
- Create: `packages/core-v2/tests/layout-sync.test.ts`

- [ ] **Step 1：失败测试**

断言：根 `width/height` 100，子节点 `height: 30` 两个纵向排列时，第二个子 `top` 为 30（与 v1 `yoga-map-layout` 行为一致）。测试内 `await loadYoga()`，构建 store，应用样式，调用 `calculateLayout` + 同步函数，读子节点 `layout.top`。

- [ ] **Step 2：实现 `applyStyle(yogaNode, style)`**

最小支持：`width`、`height`（数字）、`flexDirection`（`"row"` | `"column"`）、`flex`（数字）、`padding`（四边或单值）。实现可参考 `packages/core/src/layout/yoga-map.ts` 的对应分支，**复制必要片段**而非依赖 v1 包（避免 core-v2 依赖 `@react-canvas/core`）。

- [ ] **Step 3：`layout-sync.ts`**

- `syncLayoutFromYoga(root: SceneNode, store)`：递归 `getComputedLayout()` 写入 `node.layout`
- `absoluteBoundsFor(id, store)`：自根累加 `left/top` 得 Stage 轴对齐矩形

- [ ] **Step 4：`vp test` 通过**

- [ ] **Step 5：Commit** `feat(core-v2): yoga style subset and layout sync`

---

## Task 4：命中测试

**Files:**

- Create: `packages/core-v2/src/hit/hit-test.ts`
- Create: `packages/core-v2/tests/hit-test.test.ts`

- [ ] **Step 1：失败测试**

构造：根 100×100；子 A（先添加）占满上半；子 B（后添加）占满下半（用 `flex:1` 或固定高度）。点 `(50, 75)` 应命中 **B**（兄弟自后向前）。点 `(50, 25)` 命中 **A**。点 `(200, 200)` 返回 `null`。

- [ ] **Step 2：实现 `hitTestAt(x, y, rootId, store)`**

用 `absoluteBoundsFor` 判断包含；递归时 **自 `children.length - 1` 到 `0`**。

- [ ] **Step 3：`vp test` + Commit** `feat(core-v2): hit test with sibling paint order`

---

## Task 5：事件对象与派发（capture / bubble / stopPropagation）

**Files:**

- Create: `packages/core-v2/src/events/scene-event.ts`
- Create: `packages/core-v2/src/events/dispatch.ts`
- Create: `packages/core-v2/tests/dispatch.test.ts`

- [ ] **Step 1：监听器注册 API（在 `node-store` 或 `scene-runtime`）**

每个节点维护 `Map<eventType, { capture: Set; bubble: Set }>` 或等价结构。注册函数：

```ts
addListener(nodeId: string, type: string, fn: (ev: SceneEvent) => void, options?: { capture?: boolean }): () => void;
```

- [ ] **Step 2：`SceneEvent`**

```ts
export type PointerEventType = "pointerdown" | "pointerup" | "click";

export interface SceneEvent {
  type: PointerEventType;
  x: number;
  y: number;
  targetId: string;
  currentTargetId: string;
  phase: "capture" | "bubble";
  stopPropagation(): void;
}
```

内部字段 `_stopped`：首个 `stopPropagation()` 置位，后续监听器与后续阶段 **全部跳过**（首版采用此强语义，便于测试）。

- [ ] **Step 3：`dispatchPointerLike`**

输入：`{ type: PointerEventType; x: number; y: number }`。

1. `hitTestAt` → `targetId`；若无 target，记录 `lastTrace` 为 `miss` 并 return。
2. `path`：自 `target` 沿 `parentId` 直到根（`[root, ..., target]`）。
3. **Capture**：`for (const id of path) { ... }` 仅调用 `capture` 监听。
4. **Bubble**：`for (const id of [...path].reverse())` 仅调用 `bubble` 监听。
5. 每次调用设置 `currentTargetId = id`，`targetId` 不变；若 `_stopped` 则 break。

- [ ] **Step 4：失败测试再实现**

- 三个节点链 `root — mid — leaf`，在 `leaf` 上 `pointerdown` bubble 监听，断言收到且 `targetId === leaf`。
- 在 `mid` 上 `stopPropagation`，断言 `root` 上的 bubble **未** 触发。

- [ ] **Step 5：`vp test` + Commit** `feat(core-v2): pointer dispatch capture bubble and stopPropagation`

---

## Task 6：`createSceneRuntime` 与快照

**Files:**

- Create: `packages/core-v2/src/runtime/scene-runtime.ts`
- Modify: `packages/core-v2/src/index.ts`
- Create: `packages/core-v2/tests/snapshot.test.ts`

- [ ] **Step 1：`createSceneRuntime` 签名（异步，内部 `await loadYoga()`）**

```ts
export interface CreateSceneRuntimeOptions {
  width: number;
  height: number;
}

export async function createSceneRuntime(
  options: CreateSceneRuntimeOptions,
): Promise<SceneRuntime> {
  /* await loadYoga(); ... */
}

export interface SceneRuntime {
  getRootId(): string;
  dispatchPointerLike(ev: { type: PointerEventType; x: number; y: number }): void;
  insertView(parentId: string, id: string, style: ViewStyle): void;
  removeView(id: string): void;
  updateStyle(id: string, style: Partial<ViewStyle>): void;
  addListener(
    nodeId: string,
    type: PointerEventType,
    fn: (e: SceneEvent) => void,
    options?: { capture?: boolean },
  ): () => void;
  getSceneGraphSnapshot(): unknown;
  getLayoutSnapshot(): unknown;
  getLastDispatchTrace(): unknown;
}
```

`insertView` / `removeView` / `updateStyle` 为 react 层使用的 **稳定 imperative**；首版可合并为单一 `mutate` 若需简化，但计划名与测试名保持一致。

树变更后：**自动**调用 `rootYoga.calculateLayout(width, height, yoga.DIRECTION_LTR)`（尺寸来自 options）并 `syncLayoutFromYoga`。

- [ ] **Step 2：快照形状（可 JSON.stringify）**

- `getSceneGraphSnapshot()`：`{ rootId, nodes: Record<id, { parentId, children, ... }> }`
- `getLayoutSnapshot()`：`Record<id, { left, top, width, height, absLeft, absTop }>`（`abs*` 为 Stage）
- `getLastDispatchTrace()`：`{ hit: string | null, targetId: string | null, phases: Array<{ phase, nodeId, type, listenersFired: string[] }> }`（`listenersFired` 可用监听器的字符串标签或递增 id，便于测试断言）

- [ ] **Step 3：测试**

快照在一次派发后包含非空 `phases`；`JSON.stringify` 不抛错。

- [ ] **Step 4：导出 `packages/core-v2/src/index.ts`**

导出 `createSceneRuntime`、`SceneRuntime` 类型、`SceneEvent`、`PointerEventType`、`ViewStyle`（样式类型与 `style-map` 一致）。

- [ ] **Step 5：删除占位 `fn()`** 及旧测试中对 `fn` 的引用；`vp test` + `vp check` 全包通过。

- [ ] **Step 6：Commit** `feat(core-v2): SceneRuntime facade and debug snapshots`

---

## Task 7：react-v2 包

**Files:**

- Modify: `packages/react-v2/package.json`
- Create: `packages/react-v2/src/context.ts`
- Create: `packages/react-v2/src/canvas-runtime.tsx`
- Create: `packages/react-v2/src/view.tsx`
- Create: `packages/react-v2/src/hooks.ts`
- Modify: `packages/react-v2/src/index.ts`
- Create: `packages/react-v2/tests/react-bridge.test.tsx`

- [ ] **Step 1：依赖**

`dependencies`：

```json
"@react-canvas/core-v2": "workspace:*",
"react": "catalog:",
"react-dom": "catalog:"
```

`devDependencies`：

```json
"@types/react": "catalog:",
"@types/react-dom": "catalog:",
"@vitejs/plugin-react": "catalog:"
```

（测试若需 `@testing-library/react`，可 `vp add` 到 devDependencies，任务执行时二选一。）

- [ ] **Step 2：`<CanvasRuntime>`**

```tsx
export function CanvasRuntime(props: {
  width: number;
  height: number;
  children: React.ReactNode;
}): React.ReactElement {
  const [runtime] = React.useState(/* lazy createSceneRuntime — 需 async 时用 useEffect + ready 状态 */);
  ...
}
```

`createSceneRuntime` 为 **async**（见 Task 6）：组件内 `useEffect` 调用，`ready` 前 `children` 不渲染或渲染 `null`。`<CanvasRuntime>` 在 `ready` 后 `SceneRuntimeContext.Provider value={runtime}`。

- [ ] **Step 3：`<View>`**

- `useSceneRuntime()` 取 runtime
- `useId()` 生成稳定 `id`（React 18+），或 `useMemo(() => nanoid(), [])`（若引入 `nanoid`）
- `useLayoutEffect`：挂载时 `insertView(parentId, id, style)`，`parentId` 来自 **可选** `ParentSceneContext`；根 `CanvasRuntime` 提供 `rootId` 作为默认父
- 嵌套：`View` 为子 `View` 提供新的 `ParentSceneContext` 值为 **自身 id**
- 卸载：`removeView(id)`
- props 变更：`updateStyle`

- [ ] **Step 4：事件 props**

`onPointerDown` / `onPointerUp` / `onClick` 注册 **bubble** 监听；`vp test` 中断言调用次数。

- [ ] **Step 5：测试 `react-bridge.test.tsx`**

使用 `react-dom/client` `createRoot` + `act`，挂载：

```tsx
<CanvasRuntime width={200} height={200}>
  <View style={{ width: 100, height: 100 }} />
</CanvasRuntime>
```

断言 `getLayoutSnapshot()` 中该 view 有合理宽高（需从 context 暴露 `runtime` 测试专用 hook `useSceneRuntime` 或 `data-testid` + ref 回调传入 runtime）。

- [ ] **Step 6：`vp check` + `vp test` + Commit** `feat(react-v2): CanvasRuntime and View bridge`

---

## Task 8：apps/v2 串联

**Files:**

- Modify: `apps/v2/package.json`
- Create: `apps/v2/vite.config.ts`（若不存在；否则修改）
- Create: `apps/v2/src/main.tsx`
- Create: `apps/v2/src/App.tsx`
- Modify: `apps/v2/index.html`（入口改为 `main.tsx`）
- Delete 或停用：`apps/v2/src/main.ts`、`counter.ts` 等模板文件（若不再需要）

- [ ] **Step 1：依赖**

`apps/v2` 增加 `react`、`react-dom`、`@react-canvas/react-v2`（workspace）、`@vitejs/plugin-react`。

- [ ] **Step 2：`vite.config.ts`**

```ts
import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 3：`App.tsx`**

- 两个嵌套 `View` 重叠或上下排列（便于命中测试）
- 输入：`input type="number"` 三个：`x`、`y`，按钮「派发 pointerdown / pointerup / click」调用 `runtime.dispatchPointerLike`
- 三块 `<details>`：分别 `JSON.stringify(getSceneGraphSnapshot(), null, 2)` 等

- [ ] **Step 4：运行**

```bash
cd /Users/zhouou/Desktop/react-canvas/apps/v2 && vp dev
```

浏览器无报错，JSON 有内容。

- [ ] **Step 5：`vp check` 在 apps/v2 或通过根 `vp run`**

- [ ] **Step 6：Commit** `feat(apps/v2): wire react-v2 demo and JSON panels`

---

## Task 9：全仓验证与文档指针

- [ ] **Step 1：根目录**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp install && vp check && vp test
```

Expected: 全部通过（若 monorepo 包含其他失败包，记录在本任务备注并按仓库惯例只跑相关 workspace）。

- [ ] **Step 2：更新规格状态（可选）**

将 [`docs/superpowers/specs/2026-04-10-v2-scene-yoga-events-design.md`](../specs/2026-04-10-v2-scene-yoga-events-design.md) 标题下 **状态** 改为「已实现」并追加修订记录一行（若团队希望规格与代码同步）。

- [ ] **Step 3：Commit** `chore: verify v2 scene stack and spec status`

---

## 规格自检（计划 vs 规格）

| 规格条款                                         | 对应任务                    |
| ------------------------------------------------ | --------------------------- |
| SceneRuntime、程序化坐标                         | Task 5–6                    |
| Yoga、自动 layout                                | Task 3、6                   |
| 兄弟命中顺序                                     | Task 4                      |
| pointerdown/up/click、捕获/冒泡、stopPropagation | Task 5                      |
| 三块快照、分块 UI                                | Task 6、8                   |
| CanvasRuntime + View                             | Task 7                      |
| 不接 DOM 指针、不绘制                            | 全程；Task 8 仅按钮         |
| 测试策略                                         | Task 2–6 core；Task 7 react |

---

## 执行交接

Plan complete and saved to `docs/superpowers/plans/2026-04-10-v2-scene-yoga-events-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach do you prefer?
