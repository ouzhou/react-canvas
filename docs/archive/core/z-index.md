# zIndex 与叠放顺序

本文说明 **`ViewStyle.zIndex`** 在 **`@react-canvas/core`** 中的语义与实现，以及 **`@react-canvas/ui`** 中浮层（如 `Select`）如何通过递增分配避免「多实例同 `zIndex`」仍被兄弟盖住。

面向读者的站点教程与本文同步：`apps/website/src/content/docs/guides/z-index.mdx`（路由 `/guides/z-index/`）。

---

## 1. 摘要

- `ViewStyle` 支持 **`zIndex?: number`**，仅作用于**同一父节点**的**直接子节点**之间的**绘制顺序**与**命中测试顺序**。
- **不参与 Yoga 布局**：`ViewNode.children` 与 Yoga 子树插入顺序与 React 一致，**不**因 `zIndex` 重排。
- 未设置或非有限数字 → 参与比较时视为 **`0`**。
- 排序规则：**`zIndex` 升序**（小的先画、大的后画 → 大的在上层）；相等则保持 **React 子节点顺序**（与 Yoga 一致）。

---

## 2. 动机

仅按子节点声明顺序绘制时，**后声明的兄弟**永远盖在**先声明**的上面。浮层若写在兄弟之前，会被后续 `View` 遮挡。引入 `zIndex` 后，可在不改插入顺序的前提下抬高整棵子树。

**注意**：若多个浮层实例**共用同一 `zIndex`（例如固定 1000）**，相等时仍按 **DOM 顺序**决定叠放，**后声明的实例会盖住先声明的**。因此 UI 包对 `Select` 等组件在每次展开时分配**递增**的 `zIndex`（见第 5 节）。

---

## 3. 实现（`packages/core`）

### 3.1 样式与节点属性

- 文件：`packages/core/src/style/view-style.ts` — `zIndex?: number`。
- `packages/core/src/layout/yoga-map.ts`：`zIndex` 列入 **`VISUAL_KEYS`**，经 **`splitStyle`** 进入 **`ViewNode.props`**，**不**传给 Yoga 布局键。
- `packages/core/src/scene/view-node.ts`：`ViewVisualProps` 含 **`zIndex`**。

### 3.2 子节点排序

- 文件：`packages/core/src/render/children-z-order.ts`
- 导出：**`getSortedChildrenForPaint(node: ViewNode)`**
- 行为：对 `node.children` **拷贝**后排序 —— 按 `(zIndex 升序, 原下标升序)` 稳定排序，**不修改** `children` 原数组，**Yoga `insertChild` 顺序不变**。

### 3.3 绘制

- 文件：`packages/core/src/render/paint.ts`
- 在 **`View` / `Image` / `SvgPath`** 分支中，递归子节点时遍历 **`getSortedChildrenForPaint(node)`** 的返回值顺序（先画 `zIndex` 小的，后画大的）。

### 3.4 命中检测

- 文件：`packages/core/src/input/hit-test.ts`
- **`hitTestRecursive`** 对子节点使用**同一套**排序结果，再**从后往前**遍历子节点，与「后绘制的在上层、应优先被点到」一致。

### 3.5 对外 API

- `packages/core/src/index.ts` 导出 **`getSortedChildrenForPaint`**，便于测试或调试。

---

## 4. 代码示例

```tsx
<View style={{ flexDirection: "column" }}>
  <View style={{ height: 40, backgroundColor: "#eee" }} />
  <View
    style={{
      position: "absolute",
      top: 20,
      left: 0,
      right: 0,
      height: 80,
      zIndex: 10,
      backgroundColor: "#4488ff",
    }}
  />
  <View style={{ height: 100, backgroundColor: "#ccc" }} />
</View>
```

---

## 5. React 包：浮层递增分配（`packages/react`）

### 5.1 `useAllocateOverlayZIndex` / `allocateOverlayZIndex`

- 文件：`packages/react/src/canvas/overlay-z-index.tsx`
- **`OverlayZIndexProvider`**：内部 **`useRef(1000)`**，每次调用返回 **`ref + 1`**。
- **`CanvasProvider`** 已用 **`OverlayZIndexProvider`** 包裹子树，故**每个 `CanvasProvider` 实例**有独立计数序列；多画布、多运行时互不抢号。
- **`useAllocateOverlayZIndex()`**：返回 **`() => number`**。在 Provider 内使用该实例的分配器；**无 Provider**（如部分单测）时回退到同文件导出的 **`allocateOverlayZIndex()`**（模块级后备，自 1000 起递增）。
- **`@react-canvas/ui`** 重新导出 **`useAllocateOverlayZIndex`**、**`allocateOverlayZIndex`**，便于只依赖 UI 包的应用。

### 5.2 `Select`（`packages/ui`）

- 文件：`packages/ui/src/components/select/select.tsx`
- 使用 **`useAllocateOverlayZIndex()`**；展开时 **`useLayoutEffect`** 在 `open === true` 时 **`setOverlayZ(allocate())`**，根容器 **`zIndex: open ? overlayZ : 0`**。
- 效果：同一父级下**多个 `Select` 同时展开**时，**最后打开**的实例 `zIndex` 更大，叠在同层其它实例之上。

---

## 6. 与阶段三规格的关系

交互规格 [phase-3-interaction-design.md](../superpowers/specs/2026-04-05-phase-3-interaction-design.md) §5.2「多子重叠」曾写「若未来引入 `zIndex`，再扩展排序键」——当前实现即该排序键：**同一父节点内**按 `zIndex` + 声明序。

---

## 7. 与 Konva、PixiJS、React Native 的对照

不同库里「谁在上层」的模型并不相同，下面仅对比**常见公开语义**（以各库文档为准）。

| 来源                | `zIndex` / 层级的大致含义                                                                                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Konva（命令式）** | 官方说明 Konva 的 **`zIndex` 不是 CSS 的 z-index**，而是**节点在父级 `children` 里的下标**（0 … n-1）；改层级主要靠 **`moveToTop`** 等，本质是**改子节点顺序**。详见 [Understanding Node zIndex](https://konvajs.org/docs/groups_and_layers/zIndex.html)。                                   |
| **react-konva**     | 建议**不要**在 React 里手动调 Konva 的 `zIndex`；应通过 **state 调整渲染顺序**（例如数组重排），使后渲染的组件对应后绘制。详见 [How to change the zIndex of nodes with React?](https://konvajs.org/docs/react/zIndex.html)。                                                                 |
| **PixiJS（v8）**    | 子节点可设**数值** `zIndex`；父级 **`Container.sortableChildren = true`** 时按 `zIndex` 排序后再渲染；文档提醒**慎用**（子节点多时排序有开销），复杂场景可配合分层、Render Group 等。详见 [Container — Sorting Children](https://pixijs.com/8.x/guides/components/scene-objects/container)。 |
| **React Native**    | **`style.zIndex`** 与 Web/CSS 直觉接近：**同父级下数值大的在上**；未设置时通常**后声明的子节点**在上。详见 [View style props — zIndex](https://reactnative.dev/docs/view-style-props#zindex)。                                                                                               |

**与本仓库的关系**：

- **`@react-canvas/core`**：同父级按**数值 `zIndex` 升序**再绘制/命中，**不**改 `children` 数组顺序——语义上更接近 **PixiJS（数值排序）** 与 **RN**，**不是** Konva 那种「`zIndex` = 数组下标」。
- **「最后打开的浮层在最上」**：在 Pixi 里常见做法是临时把某个子对象的 **`zIndex` 调到高于兄弟**；本仓库用 **`useAllocateOverlayZIndex()`**（或后备 **`allocateOverlayZIndex()`**）单调递增，等价于保证**序关系**，无需在 React 里整棵重排子树。

---

## 8. 方案选择与推荐

在「叠放顺序」与「多浮层同时打开谁在上」上，建议按下面固定策略选型；**无特殊需求时不必改**。

### 8.1 Core：保持当前实现

- **继续采用**「**数值 `zIndex` + 绘制/命中前稳定排序**」，与 RN / PixiJS 的**数值排序**模型一致。
- **不要**把 Konva 的「`zIndex` = 下标」搬进本项目的 `ViewStyle` 语义，否则与现有样式、文档、心智都不一致。

### 8.2 浮层「最后打开在上」：递增分配（已实现 Provider 作用域）

- **当前实现**：**`CanvasProvider`** 内嵌 **`OverlayZIndexProvider`**，**`useAllocateOverlayZIndex()`** 与**该画布运行时**绑定；无 Provider 时回退 **`allocateOverlayZIndex()`**（模块后备）。与「每次打开给该实例一个**更大**的 `zIndex`」一致。
- **新增浮层组件**：优先使用 **`useAllocateOverlayZIndex()`**，勿再依赖**全局唯一**的模块计数（除非明确只在单测/无 Provider 场景调用 **`allocateOverlayZIndex()`**）。
- **不推荐**：为对齐 react-konva 而**纯用 state 重排兄弟子树**替代 `zIndex`——与 reconciler、Yoga 耦合成本高。

### 8.3 性能与规模

- PixiJS 提醒 **`sortableChildren` 在子节点多时**要慎用；本项目是在 **paint/hitTest** 对**子节点列表拷贝排序**，父级若子节点**极多**（例如上千）才需要再评估（一般 UI 远小于此）。

---

## 9. 延伸阅读

| 文档                                                                                           | 说明           |
| ---------------------------------------------------------------------------------------------- | -------------- |
| [known-limitations.md](../known-limitations.md)                                                | 平台能力边界   |
| [phase-3-interaction-design.md](../superpowers/specs/2026-04-05-phase-3-interaction-design.md) | 命中与多子重叠 |
