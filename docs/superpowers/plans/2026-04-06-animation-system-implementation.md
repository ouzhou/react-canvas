# 动画系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@react-canvas/react` 内实现 **RN 风格 `Animated` API**（见 [2026-04-06-animation-system-design.md](../specs/2026-04-06-animation-system-design.md)）：**`Animated.Value` / `ValueXY`、`timing` / `spring` / `decay` / `loop`、`interpolate`、组合 API、四类 `Animated.*` 宿主**；动画写回 **场景树** 的 **`opacity` + `transform`**，**绕过 Reconciler**；并满足 **前置：绘制层 `transform` + 仅重绘帧调度**（避免每帧全量 Yoga）。

**Architecture:** **Core** 扩展 **`ViewStyle` / 各节点 `props`** 的 **`transform`**，在 **`paintNode`**（及 Text / Image / SvgPath 分支）用 Skia **`save` / `concat` / `restore`** 与 RN 常见 **transform 数组** 语义对齐；**`frame-queue`** 增加 **`queuePaintOnlyFrame`**（或同名），与 `queueLayoutPaintFrame` **共享 RAF 合并**，在「仅视觉脏」时 **跳过 `calculateLayoutRoot`**。**React** 在 `packages/react/src/animated/` 实现 **纯 TS 动画内核**（值、缓动、驱动器、组合）与 **`AnimatedContext`**（持有 `surface`、`canvasKit`、`sceneRoot`、`width`、`height`、`dpr` 的 ref），宿主组件用 **ref 或内部 reconciler handle** 绑定 **`SceneNode`**，值更新时写 **`opacity`/`transform`**、`node.dirty = true`、调 **`queuePaintOnlyFrame`**。**非白名单 style 键**：**开发模式 `console.warn`**（本计划固定采用 warning，不抛错，以免拖垮测试与 Playground）。

**Tech Stack:** React、`canvaskit-wasm`、`vite-plus/test`、`vp check` / `vp test`（见根目录 `AGENTS.md`）。

**前置规格:** [2026-04-06-animation-system-design.md](../specs/2026-04-06-animation-system-design.md)、[technical-research.md](../../core/technical-research.md) §12、[hostconfig-guide.md](../../react/hostconfig-guide.md)。

---

## 文件结构（计划新增 / 修改）

| 路径                                                          | 职责                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/style/transform.ts`（新建）                | RN 风格 `Transform` 类型别名、`flattenTransformToMatrix` 或逐步 `concat` 的纯函数（输入 `CanvasKit`、输出 Skia `Matrix` 或 `concat` 序列）。                                                                                                                              |
| `packages/core/src/style/view-style.ts`                       | `ViewStyle` 增加可选 **`transform`**；**不**把 `transform` 传给 Yoga（与 RN 一致：视觉变换）。                                                                                                                                                                            |
| `packages/core/src/scene/view-node.ts`                        | `ViewVisualProps` 含 **`transform`**；`setStyle` / `updateStyle` 与 `splitStyle` 协调（见 `yoga-map.ts`）。                                                                                                                                                               |
| `packages/core/src/layout/yoga-map.ts`                        | `splitStyle`：**忽略** `transform` 进 Yoga 分支（仅进 visual）。                                                                                                                                                                                                          |
| `packages/core/src/render/paint.ts`                           | `paintNode`：在 **opacity saveLayer 前后** 或 **背景绘制前** 插入 **`skCanvas.concat`**（顺序与 RN 一致：在 **layout 偏移 `(x,y)` 之后**、在 **子递归** 前对当前节点应用 transform；与现有 `save`/`restore` 配对）。                                                      |
| `packages/core/src/render/paint.ts`（Text / Image / SvgPath） | 各分支在 **自身内容绘制前** 应用 **同一套** `node.props.transform`（若节点类型共享 `ViewNode` 基类 props，可统一在 `paintNode` 入口处理一次）。                                                                                                                           |
| `packages/core/src/runtime/frame-queue.ts`                    | 见 **Task 1**：`needsLayout` 标志 + **`queuePaintOnlyFrame`**；rAF 回调内 **条件** `calculateLayoutRoot`。                                                                                                                                                                |
| `packages/core/src/index.ts`                                  | 导出 `queuePaintOnlyFrame`、（可选）`Transform` 类型。                                                                                                                                                                                                                    |
| `packages/core/src/input/hit-test.ts`                         | **Task 2**：命中前将 **点** 或 **局部矩形** 与 **transform** 一致（逆变换点进局部空间再 `pointInRect`，或与 paint 共享矩阵工具）。                                                                                                                                        |
| `packages/react/src/animated/`                                | 子模块：`easing.ts`、`interpolation.ts`、`numeric-value.ts`、`value-xy.ts`、`timing.ts`、`spring.ts`、`decay.ts`、`loop.ts`、`composition.ts`、`animated-props.ts`（白名单校验）、`animated-host.tsx`（工厂）、`context.ts`、`index.ts`（组装 **`Animated` 命名空间**）。 |
| `packages/react/src/index.ts`                                 | `export { Animated } from "./animated/index.ts"`。                                                                                                                                                                                                                        |
| `packages/react/src/jsx-augment.d.ts`                         | `Animated.*` 的 props 若有需补充。                                                                                                                                                                                                                                        |
| `packages/react/tests/animated-*.test.tsx`                    | 纯逻辑 +（可选）headless 集成。                                                                                                                                                                                                                                           |
| `packages/core/tests/frame-queue-paint-only.test.ts`（新建）  | 验证 paint-only 路径 **不调用** Yoga（可 spy / mock `calculateLayoutRoot` 若可注入，或通过 **计数器** 在测试替身 root 上挂钩子）。                                                                                                                                        |
| `apps/website/src/content/docs/`                              | Animated 文档页（MDX）。                                                                                                                                                                                                                                                  |

---

### Task 1: Core — 帧队列「仅重绘」路径

**Files:**

- Modify: `packages/core/src/runtime/frame-queue.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/tests/frame-queue-paint-only.test.ts`

**背景：** 现有 `queueLayoutPaintFrame` 每次 rAF 都执行 `rootNode.calculateLayout`（见 `frame-queue.ts` 第 42 行）。动画若每帧走此路径会 **不必要地跑全树 Yoga**，与规格「绕过 reconcile、直接改节点」的性能目标冲突。

- [ ] **Step 1:** 将 `SurfaceQueueState` 扩展为至少包含 **`needsLayout: boolean`**（或等价命名）。`queueLayoutPaintFrame` 在排队时将 **`needsLayout = true`**（与「本帧需要 Yoga」语义 OR）。新函数 **`queuePaintOnlyFrame(surface, canvasKit, rootNode, width, height, dpr)`** 在排队时 **不** 将 `needsLayout` 置 true（若本轮已由 layout 排队为 true 则保持 true）。

- [ ] **Step 2:** 合并到 **单次** `requestAnimationFrame`：回调内 **`if (needsLayout) rootNode.calculateLayout(...)`**；**始终** `paintScene(...)`；重置状态。

- [ ] **Step 3:** 单元测试：构造 **minimal mock** 或 **轻量 ViewNode 树**，**spy** `calculateLayout`（可在测试专用 `ViewNode` 子类覆盖 `calculateLayout` 计数）——断言 **仅** `queuePaintOnlyFrame` 触发时 **计数为 0**，**仅** `queueLayoutPaintFrame` 时 **计数 ≥ 1**。若当前结构难以 spy，则在计划中采用 **可注入的 `layoutRunner`** 仅在测试替换（实现时保持生产路径零开销）。

- [ ] **Step 4:** 运行 `vp check` 与 `vp test`。

- [ ] **Step 5:** Commit：`feat(core): queue paint-only frames without yoga`

---

### Task 2: Core — `transform` 样式与绘制

**Files:**

- Create: `packages/core/src/style/transform.ts`
- Modify: `packages/core/src/style/view-style.ts`
- Modify: `packages/core/src/scene/view-node.ts`
- Modify: `packages/core/src/layout/yoga-map.ts`
- Modify: `packages/core/src/render/paint.ts`
- Create: `packages/core/tests/transform-paint.test.ts`（可选：用 mock CanvasKit 困难时，先测 **纯矩阵函数** + 快照 `flatten` 结果）

- [ ] **Step 1:** 定义 **RN 兼容子集**，例如：

```ts
export type TransformOp =
  | { readonly translateX?: number; readonly translateY?: number }
  | { readonly scale?: number }
  | { readonly scaleX?: number; readonly scaleY?: number }
  | { readonly rotate?: `${number}deg` | number }; // 实现时统一为弧度

export type TransformStyle = readonly TransformOp[];
```

在 **`transform.ts`** 实现 **`applyTransformToCanvas(skCanvas, ops, canvasKit, originX, originY)`**：  
**原点**对齐 RN 常见行为：**在节点边界框中心** 做 rotate/scale（与 RN 文档一致处写明；若采用 **左上角原点**，须在规格附录注明）。**顺序**：按数组 **从左到右** 与 RN `transform` 数组一致。

- [ ] **Step 2:** `ViewStyle` 增加 `transform?: TransformStyle`。`splitStyle` / `yoga-map`：**不把** `transform` 传入 Yoga。

- [ ] **Step 3:** `paintNode` 在计算 **`x,y,w,h`** 后、绘制背景前：**`skCanvas.save()`**，**`translate(x,y)`**（与现有一致），再 **`applyTransform`**（使用 **以 w,h 为基准** 的原点），再绘制 rect / 子节点；子节点递归的 **offset** 规则与 **不加 transform 时** 一致（子仍用 layout 相对坐标；**父 concat 已作用于 canvas**）。若与现有 **saveLayer(opacity)** 交互复杂，规格顺序：**save → opacity layer（若需）→ transform → 内容**；须 **配对 restore**。

- [ ] **Step 4:** **Text / Image / SvgPath** 节点若 **独立** `paint` 分支，确保 **同样** 读取 `node.props.transform`（若统一在 `paintNode` 最外层已 concat，避免 **重复**）。

- [ ] **Step 5:** `vp check` + `vp test`。

- [ ] **Step 6:** Commit：`feat(core): view transform style and paint`

---

### Task 3: Core — 命中检测与 transform 一致

**Files:**

- Modify: `packages/core/src/input/hit-test.ts`
- Create: `packages/core/tests/hit-test-transform.test.ts`

- [ ] **Step 1:** 在 **`hitTestRecursive`** 中，对 **点 `(pageX, pageY)`** 在检测 **AABB** 前，将 **点** 变换到 **当前节点局部坐标**（对 **累积世界矩阵** 求逆，或仅对 **translate+rotate+scale** 子集实现 **逆变换**）。**子节点递归** 时 **offset** 必须与 **paint** 中父子关系一致。

- [ ] **Step 2:** 单元测试：构造 **单层 View**，`layout` 固定，`transform` 为 **translate**，断言 **平移后** 命中区域变化（无需真实 CanvasKit）。

- [ ] **Step 3:** `vp test`。

- [ ] **Step 4:** Commit：`fix(core): hit testing respects transform`

---

### Task 4: React — `AnimatedContext` 与帧句柄

**Files:**

- Create: `packages/react/src/animated/context.ts`
- Modify: `packages/react/src/canvas/canvas.tsx`
- Modify: `packages/react/src/reconciler/host-config.ts`（仅当需要把 **PaintFrameRef** 塞进 context provider 时）

- [ ] **Step 1:** 定义 **`CanvasAnimationContextValue`**：`queuePaintOnly: () => void`（闭包捕获 `frameRef`）、**`getFrameSnapshot(): { surface, canvasKit, sceneRoot, width, height, dpr } | null`**，或等价 ref。**Provider** 放在 **`Canvas`** 内、**reconciler 根已创建** 且 **`frameRef` 已填充 surface** 之后（用 **`useLayoutEffect`** 或 **render 后 ref** 同步，避免首帧 null）。

- [ ] **Step 2:** `queuePaintOnly` 内部调用 **`queuePaintOnlyFrame`**（从 `@react-canvas/core` 导入）。

- [ ] **Step 3:** 导出 **`useCanvasAnimation`**`()`，在 **无 Provider** 时 **抛错**（与 `useCanvasRuntime` 模式一致）。

- [ ] **Step 4:** `vp check`。

- [ ] **Step 5:** Commit：`feat(react): canvas animation context`

---

### Task 5: Animated — 数值、`interpolate`、Easing

**Files:**

- Create: `packages/react/src/animated/interpolation.ts`
- Create: `packages/react/src/animated/easing.ts`
- Create: `packages/react/src/animated/numeric-value.ts`
- Create: `packages/react/tests/animated-interpolation.test.ts`

- [ ] **Step 1:** 实现 **`interpolate`**（输入 `value`、输入域 `[inMin,inMax]`、输出域 `[outMin,outMax]`、**`extrapolate`** / **`extrapolateLeft`** / **`extrapolateRight`**：`extend` | `clamp` | `identity` RN 语义）。

```ts
import { expect, test } from "vite-plus/test";
import { interpolate } from "../src/animated/interpolation.ts";

test("extrapolate clamp", () => {
  const fn = (v: number) =>
    interpolate(v, { inputRange: [0, 1], outputRange: [10, 20], extrapolate: "clamp" });
  expect(fn(0)).toBe(10);
  expect(fn(1)).toBe(20);
  expect(fn(-1)).toBe(10);
  expect(fn(2)).toBe(20);
});
```

- [ ] **Step 2:** **`Animated.Value`**（或 `numeric-value.ts` 内类）：`_value`、`addListener`、`removeListener`、`setValue`、`setOffset`、`flattenOffset`、`stopAnimation`（取消当前 **驱动** 句柄）。

- [ ] **Step 3:** `vp test` 覆盖 **interpolate** 边界。

- [ ] **Step 4:** Commit：`feat(react): animated value and interpolate`

---

### Task 6: Animated — `timing`、`spring`、`decay`、`loop`

**Files:**

- Create: `packages/react/src/animated/timing.ts`
- Create: `packages/react/src/animated/spring.ts`
- Create: `packages/react/src/animated/decay.ts`
- Create: `packages/react/src/animated/loop.ts`
- Create: `packages/react/src/animated/clock.ts`（**`Date.now()` 可注入**，便于测试）
- Create: `packages/react/tests/animated-drivers.test.ts`

- [ ] **Step 1:** **`timing(value, { toValue, duration, easing, useNativeDriver: ignored })`**：返回 **`{ start, stop }`** 或 **Promise-like**，内部 **`requestAnimationFrame` 循环** 或 **单 rAF 链**；每步 **`value.setValue(...)`**。**`easing`** 默认 `Easing.inOut(Easing.ease)`（对齐 RN 默认需查 RN 文档；若简化，在文档写明）。

- [ ] **Step 2:** **`spring`**：采用 **单轴弹簧** 近似（stiffness/damping/mass 或 tension/friction），与 RN **默认参数** 可对齐或文档声明差异。

- [ ] **Step 3:** **`decay`**：**初速度** + **减速**；`Value` 速度衰减至阈值停。

- [ ] **Step 4:** **`loop(animation)`**：重复子动画；支持 **`iterations: -1`** 无限。

- [ ] **Step 5:** 测试使用 **fake timers**（若 `vite-plus` / 环境支持）或 **注入 clock**：

```ts
// animated/clock.ts
let nowImpl = () => Date.now();
export function setNowProvider(fn: () => number): void {
  nowImpl = fn;
}
export function now(): number {
  return nowImpl();
}
```

测试中 `setNowProvider` 手动推进时间。

- [ ] **Step 6:** Commit：`feat(react): animated timing spring decay loop`

---

### Task 7: Animated — `ValueXY`、`parallel`、`sequence`、`stagger`

**Files:**

- Create: `packages/react/src/animated/value-xy.ts`
- Create: `packages/react/src/animated/composition.ts`
- Create: `packages/react/tests/animated-composition.test.ts`

- [ ] **Step 1:** **`ValueXY`**：内含 **两个 `Animated.Value`**，`setValue({x,y})`、`getLayout` 等价方法（对齐 RN API 子集）。

- [ ] **Step 2:** **`parallel([...])` / `sequence([...])` / `stagger(ms, [...])`**：返回 **可 `start`/`stop`** 的复合对象；**stagger** 按延迟启动子动画。

- [ ] **Step 3:** 单测：**sequence** 顺序、**parallel** 同时结束条件、**stagger** 时间间隔。

- [ ] **Step 4:** Commit：`feat(react): animated valueXY and composition`

---

### Task 8: Animated — 宿主绑定、`Animated.View` / `Text` / `Image` / `SvgPath`

**Files:**

- Create: `packages/react/src/animated/animated-props.ts`
- Create: `packages/react/src/animated/create-animated-component.tsx`
- Create: `packages/react/src/animated/animated-view.tsx`（或单一工厂文件）
- Modify: `packages/react/src/animated/index.ts`
- Modify: `packages/react/src/index.ts`

- [ ] **Step 1:** **`assertAnimatedStyle(style)`**：递归展平数组 style，**仅允许** `opacity`、`transform`（及 **`Animated.Value` 插值结果** 占位类型）。其它键：**`process.env.NODE_ENV !== "production"`** 时 **`console.warn`**（见 `runtime-init-store.ts` 同类判断可抽 **isDev()`**）。

- [ ] **Step 2:** **`createAnimatedComponent(Base)`**：克隆 **`View` / `Text` / `Image` / `SvgPath`**，**ref 转发**到 **内部** 对 **`SceneNode` 的句柄**。若当前宿主 **无 forwardRef 到 SceneNode**，需在 **`host-config` 或宿主实现** 暴露 **`useSceneNodeRef`** 或 **`attachRef` callback**（**本任务核心工程点**）：实现方式二选一并在代码注释固定：
  - **A)** 扩展 **`View` 等** 支持 **`ref` 回调** 接收 `ViewNode`；或
  - **B)** **`Animated` 内部** 用 **唯一 id** 在 **HostConfig `createInstance`** 注册到 **Map**，`commitMount` 时关联。  
    **推荐 A**（更直观、易卸载清理）。

- [ ] **Step 3:** 每个 **Animated 值** 订阅 **更新**：`value.addListener(() => { 写 node.props.opacity/transform; node.dirty=true; queuePaintOnly(); })`。

- [ ] **Step 4:** **unmount**：`stopAnimation`、**removeListener**、**清空** 对 `SceneNode` 引用。

- [ ] **Step 5:** 组装 **`export const Animated = { Value, ValueXY, timing, spring, decay, loop, interpolate, parallel, sequence, stagger, View: AnimatedView, ... }`**。

- [ ] **Step 6:** `vp check` + `vp test`。

- [ ] **Step 7:** Commit：`feat(react): animated hosts and node writeback`

---

### Task 9: 集成测试与文档

**Files:**

- Create: `packages/react/tests/animated-integration.test.tsx`（若环境需 DOM，沿用现有 canvas 测试模式）
- Create: `apps/website/src/content/docs/guides/animated.mdx`（路径按 Starlight 侧栏配置调整）
- Modify: `apps/website/astro.config` 或 `sidebar`（若需）

- [ ] **Step 1:** 集成测试：**mount** 迷你 **`CanvasProvider` + `Canvas` + `Animated.View`**，`opacity` **timing** 结束断言 **场景节点** `props.opacity`（通过 **exported test helper** 或 **core 调试 API** 只测 dev）。若 **无法** 取节点引用，则 **退化为**「监听器调用次数 + `queuePaintOnly` mock」。

- [ ] **Step 2:** 文档：**V1 限制**、**无 `Animated.event`**、**无 `useNativeDriver` 真含义**、**与 RN 差异**、**transform 前置**。

- [ ] **Step 3:** `vp check` + `vp test`。

- [ ] **Step 4:** Commit：`docs: animated guide and integration test`

---

## 规格自检（计划 vs 规格）

| 规格 §                                   | 覆盖 Task             |
| ---------------------------------------- | --------------------- |
| 绕过 Reconciler、脏、重绘                | Task 1、8             |
| opacity + transform 白名单               | Task 2、8             |
| interpolate + extrapolate                | Task 5                |
| parallel / sequence / stagger            | Task 7                |
| timing / spring / decay / loop / ValueXY | Task 5、6、7          |
| 四类宿主                                 | Task 8                |
| 无 Animated.event                        | 不实现（文档 Task 9） |
| dev 非白名单 warning                     | Task 8                |
| 命中与 transform                         | Task 3                |
| 文档                                     | Task 9                |

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-06-animation-system-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. **REQUIRED SUB-SKILL:** superpowers:subagent-driven-development.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. **REQUIRED SUB-SKILL:** superpowers:executing-plans.

Which approach do you want?
