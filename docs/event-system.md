# 事件系统设计

> 基于 `@react-canvas/core` 当前实现（2026-04-10）的事件系统整理，包含架构分析、已知问题、以及弹窗事件穿透的解决方案。

---

## 1. 整体架构

```
DOM PointerEvent / WheelEvent
  │
  ├── canvas.pointerdown ──┐
  ├── document.pointermove ├── attachCanvasPointerHandlers()
  ├── document.pointerup   │        │
  ├── document.pointercancel│       │
  └── canvas.wheel ────────┘        │
                                    ▼
                         ┌──────────────────────┐
                         │ 坐标转换              │
                         │ clientToCanvasLogical │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │ 命中测试              │
                         │ hitTestAmongLayerRoots│ ← 多 Layer 逆序（高 zIndex 优先）
                         │   └── hitTest()       │ ← 单根递归（含 transform、overflow）
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌────────────┐ ┌────────────┐ ┌──────────────┐
             │ dispatchBubble │ │ hover diff │ │ scroll chain │
             │ target → root │ │ enter/leave│ │ wheel → SV   │
             └────────────┘ └────────────┘ └──────────────┘
                    │               │               │
                    ▼               ▼               ▼
              InteractionHandlers  InteractionState  ScrollView.scrollY
              (.onClick, etc.)     (.hovered, etc.)  + requestLayoutPaint
```

### 1.1 模块清单

| 模块       | 文件                      | 职责                                                                                         |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| 类型定义   | `input/types.ts`          | `CanvasSyntheticPointerEvent`、`InteractionHandlers`、`InteractionState`                     |
| 命中测试   | `input/hit-test.ts`       | 递归 hit-test（含 transform 逆矩阵、overflow:hidden 裁剪、zIndex 排序、ScrollView 滚动偏移） |
| 事件分发   | `input/dispatch.ts`       | `dispatchBubble`：从 target 向 sceneRoot **冒泡**，逐节点调 handler                          |
| Hover 合成 | `input/hover.ts`          | `diffHoverEnterLeave`：对比前后命中叶节点 → `pointerenter` / `pointerleave`                  |
| Click 合成 | `input/click.ts`          | `shouldEmitClick`：down/up 距离阈值 + 同节点命中 → 合成 `click`                              |
| 指针入口   | `input/canvas-pointer.ts` | `attachCanvasPointerHandlers`：绑定 DOM 事件 → 协调以上全部模块                              |
| 滚动链     | `input/scroll-chain.ts`   | `applyWheelToScrollViewChain`：内→外链式消费 wheel、`overscrollBehavior`                     |
| 光标管理   | `input/cursor-manager.ts` | 优先级栈：`system` > `plugin` > `node`                                                       |
| 焦点管理   | `stage/focus-manager.ts`  | 画布内焦点（无 DOM focus）；`pointerdown` 命中时 focus/blur                                  |
| 指针捕获   | `stage/stage.ts`          | `setPointerCapture` / `releasePointerCapture`：拖拽时跳过 hitTest                            |
| Layer      | `stage/layer.ts`          | 分层系统：`zIndex` + `captureEvents` + `visible`                                             |

---

## 2. 事件流详解

### 2.1 CanvasSyntheticPointerEvent

自定义合成事件（非 DOM Event），字段：

```ts
type CanvasSyntheticPointerEvent = {
  type:
    | "pointerdown"
    | "pointerup"
    | "pointermove"
    | "pointercancel"
    | "click"
    | "pointerenter"
    | "pointerleave";
  pointerId: number;
  target: ViewNode; // 最深命中节点（整次分发不变）
  currentTarget: ViewNode; // 冒泡当前节点
  locationX: number; // 相对 currentTarget 的局部坐标
  locationY: number;
  pageX: number; // 相对画布逻辑原点
  pageY: number;
  timestamp: number;
  stopPropagation(): void;
  preventDefault(): void;
  defaultPrevented: boolean;
};
```

### 2.2 InteractionHandlers

挂在 `ViewNode.interactionHandlers` 上，由 reconciler commitUpdate 整体替换：

```ts
type InteractionHandlers = {
  onPointerDown?: (e: CanvasSyntheticPointerEvent) => void;
  onPointerUp?: (e: CanvasSyntheticPointerEvent) => void;
  onPointerMove?: (e: CanvasSyntheticPointerEvent) => void;
  onPointerEnter?: (e: CanvasSyntheticPointerEvent) => void;
  onPointerLeave?: (e: CanvasSyntheticPointerEvent) => void;
  onClick?: (e: CanvasSyntheticPointerEvent) => void;
};
```

### 2.3 命中测试

`hitTest` 从场景根递归遍历子节点：

1. **跳过** `display: none` 节点
2. 构建 **world 变换**：`parent * translate(layout.left, layout.top) * localTransform`
3. 逆矩阵将 page 坐标转为 **local 坐标**
4. 判断是否在节点边界内（含 `overflow:hidden` 的圆角裁剪）
5. **子节点按 paint 逆序**（`getSortedChildrenForPaint`，含 `zIndex`）测试 → 返回最深命中
6. 无子命中 → 返回当前节点自身（如果 local point 在矩形内）

多 Layer 时 `hitTestAmongLayerRoots` 从 **zIndex 最高的 Layer 根** 向低逐层测试，首个命中即返回。

### 2.4 分发流程

`dispatchBubble(path, sceneRoot, kind, pageX, pageY, pointerId, timestamp)`：

- `path = [sceneRoot, ..., target]`
- **仅冒泡**：从 `target`（`path[length-1]`）向 `sceneRoot`（`path[0]`）遍历
- 每个节点构造 `CanvasSyntheticPointerEvent`，用 `getWorldOffset` 算出 `locationX/Y`
- 按 `kind` 调对应 handler；`stopPropagation()` 终止冒泡

### 2.5 Hover 合成

`diffHoverEnterLeave(prevLeaf, nextLeaf, sceneRoot)`：

- 分别构造 prev/next 的路径（到 sceneRoot）
- 求最长公共前缀 k
- `leave = prevPath[k..].reverse()`（叶→根），`enter = nextPath[k..]`（根→叶）
- 对每个节点单独 dispatch `pointerenter` / `pointerleave`（不冒泡）

### 2.6 Click 合成

`shouldEmitClick(downSnapshot, pageX, pageY, sceneRoots, canvasKit)`：

- down→up 位移 ≤ `DEFAULT_CLICK_MOVE_THRESHOLD_PX`（10px）
- up 点再次 hitTest 命中同一 `target`
- 两个条件都满足 → 派发 `click` 事件

### 2.7 指针捕获（PointerCapture）

```ts
stage.setPointerCapture(node, pointerId);
stage.releasePointerCapture(node, pointerId);
```

激活后：

- `pointermove` / `pointerup` 跳过 hitTest，直接 dispatch 到捕获节点
- `pointerup` / `pointercancel` 分发后自动 release
- 用于拖拽场景（如 ScrollView 滚动条拖拽、plugin-viewport 平移）

### 2.8 ScrollView 滚动

**滚动条拖拽**：`pointerdown` 时判断是否命中垂直滚动条轨道 → 后续 `pointermove` 按拖拽距离映射为 `scrollY` 变化。

**滚轮**：`wheel` → `applyWheelToScrollViewChain` → 从命中叶节点向上收集 `ScrollView` 链 → 内层优先消费 `deltaY`，边界处理由 `overscrollBehavior` 控制（`contain`/`none` 阻止上传）。

### 2.9 光标管理

三级优先级栈：

| 优先级   | 用途                                    | 写入方式                              |
| -------- | --------------------------------------- | ------------------------------------- |
| `system` | 最高，系统级覆盖                        | `cursorManager.set(cursor, "system")` |
| `plugin` | 插件级（如 viewport 平移时 `grabbing`） | `cursorManager.set(cursor, "plugin")` |
| `node`   | 节点 `props.cursor`，沿命中链向上查找   | `cursorManager.setFromNode(cursor)`   |

`resolve()` 取最高非空栈顶 → 写入 `canvas.style.cursor`。

### 2.10 焦点管理

`FocusManager`：

- `pointerdown` 命中 → `focus(hit)`（`focusable !== false` 时）
- 命中空白处或 `focusable: false` 节点 → `blur()`
- 焦点变化同步写入 `ViewNode.interactionState.focused`

### 2.11 InteractionState

`ViewNode` 维护三个合成状态位：

```ts
type InteractionState = {
  hovered: boolean; // hover diff 写入
  pressed: boolean; // pointerdown/up 写入（多指计数）
  focused: boolean; // FocusManager 写入
};
```

通过 `applyInteractionPatch` 合并写入，`onInteractionStateChange` 通知订阅者（React 层 `useSyncExternalStore`）。

---

## 3. Layer 系统与事件

### 3.1 内置三层

| Layer          | zIndex | captureEvents | 用途               |
| -------------- | ------ | ------------- | ------------------ |
| `defaultLayer` | 0      | false         | 主内容             |
| `overlayLayer` | 100    | false         | Tooltip / Dropdown |
| `modalLayer`   | 1000   | **true**      | Modal / Dialog     |

`getVisibleLayerRoots()` 返回 `visible === true` 的 Layer 根节点数组，按 `zIndex` 升序排列。

### 3.2 命中测试与层

`hitTestAmongLayerRoots(layerRootsLowToHigh, pageX, pageY, canvasKit, camera)`：

- 从 **最高 zIndex** 往低逐层做 `hitTest`
- 首个命中即返回 `{ hit, layerRoot }`
- 未命中的层被跳过

---

## 4. 已知问题与差距分析

### 4.1 `captureEvents` 未在事件分发中生效

**设计意图**（`core-design.md` §8.3）：

```
if layer.captureEvents: break  ← 无论命中与否都阻断向低层传递
```

**当前实现**：

- `attachCanvasPointerHandlers` 的 `pickHit` 调用 `hitTestAmongLayerRoots`
- `hitTestAmongLayerRoots` 接收的是 `ViewNode[]`（纯根节点数组），不携带 `Layer` 元信息
- **没有任何代码读取 `Layer.captureEvents`**

**影响**：

- 如果 `modalLayer` 有全屏 backdrop 节点覆盖整个画布 → 因为高层 hitTest 命中 backdrop，低层不会被测试 → **变相阻断**（demo 就是这样做的）
- 如果 `modalLayer` 只有一个小弹窗，没有全屏遮罩 → 用户点击弹窗外的空白区域，`modalLayer` hitTest 返回 null → 继续向低层 hitTest → **底层节点收到事件 → 事件穿透！**

### 4.2 缺少捕获阶段

`core-design.md` §8.4 设计了捕获（root→target）+ 冒泡（target→root），但实际 `dispatchBubble` **只有冒泡**。`InteractionHandlers` 类型也没有 `onPointerDownCapture` 等字段。

这意味着父节点无法在事件到达子节点之前拦截它——与 DOM 的 capture phase 能力缺失。

### 4.3 多 Layer 时 hover diff 被跳过

```ts
// canvas-pointer.ts 中
if (multiLayer) {
  interaction?.afterHoverDiff?.([], []);
  hoverLeaf = hit;
  // 不调 diffHoverEnterLeave、不派发 pointerenter/leave
  return;
}
```

多层时跳过了 hover enter/leave 的派发，`InteractionState.hovered` 的变更依赖 `afterHoverDiff` 中空数组 → 不会更新任何节点的 hovered 状态。

---

## 5. 弹窗事件穿透问题与解决方案

### 5.1 问题描述

当 `modalLayer`（或 `overlayLayer`）显示弹窗但**未铺满全屏 backdrop** 时，点击弹窗周围的空白区域，事件会穿透到底层（`defaultLayer`）的节点上。

根因：`hitTestAmongLayerRoots` 在高层未命中时直接跳到下一层，不检查 `captureEvents`。

### 5.2 方案：在命中测试入口尊重 `captureEvents`

**核心思路**：将 `Layer` 信息传入事件分发链路，使 `captureEvents === true` 的层即使未命中也截断向下传递。

#### 5.2.1 修改 `hitTestAmongLayerRoots` 签名

从传入 `ViewNode[]` 改为传入携带 `captureEvents` 信息的结构：

```ts
export type LayerHitEntry = {
  root: ViewNode;
  captureEvents: boolean;
};

export function hitTestAmongLayers(
  layersLowToHigh: readonly LayerHitEntry[],
  pageX: number,
  pageY: number,
  canvasKit: CanvasKit,
  camera?: ViewportCamera | null,
): { hit: ViewNode; layerRoot: ViewNode } | null {
  for (let i = layersLowToHigh.length - 1; i >= 0; i--) {
    const entry = layersLowToHigh[i]!;
    const h = hitTest(entry.root, pageX, pageY, canvasKit, camera);
    if (h) return { hit: h, layerRoot: entry.root };
    // 关键：captureEvents 的层即使空白处未命中，也不向下传递
    if (entry.captureEvents) return null;
  }
  return null;
}
```

#### 5.2.2 修改 `Stage.getVisibleLayerRoots` 返回 `LayerHitEntry[]`

```ts
private getVisibleLayerEntries(): LayerHitEntry[] {
  return this.layersInPaintOrder()
    .filter((l) => l.visible)
    .map((l) => ({ root: l.root, captureEvents: l.captureEvents }));
}
```

#### 5.2.3 更新 `attachCanvasPointerHandlers` 的 `pickHit`

让 `pickHit` 使用新的 `hitTestAmongLayers`，对 `captureEvents` 层进行空白处阻断。

#### 5.2.4 同步更新 `pickScrollbar` 和 `onWheel`

滚轮和滚动条命中也需遵守同样的层级阻断逻辑。

### 5.3 方案优势

- **最小改动**：只修改命中测试入口的循环逻辑，不影响 `dispatchBubble`、`hover`、`click` 等下游
- **向后兼容**：`captureEvents: false`（默认）的层行为不变
- **语义正确**：与 `core-design.md` §8.3 设计完全一致
- **无需全屏 backdrop**：Modal 弹窗无需铺满整个画布也能阻断底层事件

### 5.4 业务层配合

```ts
// 打开弹窗
stage.modalLayer.visible = true;
stage.modalLayer.add(dialogNode);
// captureEvents 已默认 true，无需额外设置

// 关闭弹窗
stage.modalLayer.remove(dialogNode);
stage.modalLayer.visible = false;
```

如果需要点击弹窗外区域关闭弹窗（dismiss on backdrop tap），有两种方式：

**方式 A：全屏 backdrop 节点（推荐，当前 demo 的做法）**

```ts
const backdrop = new ViewNode(yoga, "View");
backdrop.setStyle({ width: "100%", height: "100%" });
backdrop.interactionHandlers = {
  onClick: () => closeModal(),
};
backdrop.appendChild(dialog);
stage.modalLayer.add(backdrop);
```

**方式 B：在 `onPointerDownHit` 回调中处理未命中**

`captureEvents` 层未命中时返回 `null`。可通过 `attachPointerHandlers` 的 `interaction.onPointerDownHit` 回调检测到空白处点击：

```ts
// Stage 内已有此回调：
interaction.onPointerDownHit = (hit) => {
  if (hit === null && stage.modalLayer.visible) {
    closeModal();
  }
};
```

### 5.5 未来可选增强

| 增强                           | 说明                                                            |
| ------------------------------ | --------------------------------------------------------------- |
| 捕获阶段                       | `onPointerDownCapture` 等，允许父节点在冒泡前拦截               |
| `pointerEvents: "none"`        | 节点级穿透控制（等价 CSS `pointer-events: none`）               |
| 多层 hover diff                | 修复 `multiLayer` 下 `pointerenter`/`pointerleave` 不派发的问题 |
| `Layer.captureEvents` 动态切换 | `overlayLayer` 在有 Dropdown 时临时开启 `captureEvents`         |

---

## 6. 总结

当前事件系统的核心流程（命中测试 → 冒泡分发 → hover/click 合成 → 指针捕获 → 滚动链）已经完备，与 RN 的 press/hover 心智模型对齐。主要缺口在于：

1. **`captureEvents` 未接入命中测试循环**——弹窗穿透的根源，修复方案明确（§5.2）
2. **无捕获阶段**——当前仅冒泡，父节点拦截需依赖 `stopPropagation` 而非 capture
3. **多层 hover diff 缺失**——影响 hover 状态正确性

其中 `captureEvents` 是最紧迫的修复项，且改动范围可控。
