# 阶段一：核心渲染管线 — 设计规格

> 目标：嵌套的 `<View style={...} />` 能在 Canvas 上按照 Flexbox 规则正确布局并通过 CanvasKit (Skia WASM) 绘制。

---

## 决策记录

| 决策点         | 选择                                                                                                          | 理由                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 节点设计       | 单一 `ViewNode` 类型 + `type` 字段                                                                            | 简洁，前期代码少，后续通过 type 区分 Text / Image |
| Yoga 加载      | WASM async (`yoga-layout/wasm-async`)                                                                         | 性能优先                                          |
| 绘制后端       | 直接 CanvasKit (Skia WASM)，跳过 Canvas 2D                                                                    | 避免写两套绘制代码；Skia API 更强大               |
| 根组件 API     | 显式 Provider (`CanvasProvider` + `Canvas`)                                                                   | 用户可控制初始化时机和加载 UI                     |
| style 属性范围 | 宽集合（含 gap / flexWrap / min-max / display）                                                               | Yoga 原生支持，映射成本低                         |
| 测试策略       | headless 布局断言 + 文档站 playground 可视化                                                                  | CI 友好 + 开发时人眼验证                          |
| 帧调度         | rAF 去重（`surface.requestAnimationFrame`）                                                                   | 简单，React 18 batching 已覆盖大多数场景          |
| 包职责分层     | `core` 不依赖 React（场景树 + 布局 + 绘制），`react` 做 Reconciler 桥接                                       | 关注点分离，core 可被 Vue 等框架复用              |
| 阶段一实现澄清 | 见下表「实现收敛」与 [superpowers 澄清记录](../superpowers/specs/2026-04-04-phase-1-clarifications-design.md) | 经 2026-04-04 问答确认                            |

**实现收敛（阶段一）：** `style` **仅对象**（不支持数组）；Reconciler **隐式容器根**；`<canvas>` **优先 ref** 接 Surface（必要时唯一 `id` 兜底）；**支持** `width`/`height` 等**百分比字符串**（相对父盒，首层 `View` 相对 `Canvas` 逻辑尺寸）；`<Canvas>` **仅允许单个子节点**（阶段一为单个 `<View>`）。

---

## 架构总览

```
@react-canvas/react                         @react-canvas/core
┌──────────────────────────────┐            ┌────────────────────────────────┐
│ CanvasProvider               │            │ ViewNode                       │
│   并行加载 Yoga + CanvasKit  │            │   type / yogaNode / children   │
│   通过 Context 暴露 ready    │            │   props (视觉属性)             │
│                              │            │   layout (布局结果)            │
│ Canvas                       │            │   dirty flag                   │
│   创建 Surface               │            │   setStyle / updateStyle       │
│   创建 Reconciler 容器       │            │   appendChild / removeChild    │
│   帧调度 queueLayoutPaintFrame   │            │   calculateLayout / destroy    │
│                              │            │                                │
│ HostConfig                   │──creates──▶│ applyStylesToYoga              │
│   createInstance → ViewNode  │            │   style 对象 → Yoga API 调用   │
│   prepareUpdate → diff       │            │                                │
│   commitUpdate → 差量更新    │            │ paintScene（同步，rAF 内调用） │
│   resetAfterCommit → 帧调度   │            │   递归 paintNode → Skia 绘制   │
│                              │            │                                │
│ View (JSX 组件)              │            │ initYoga / initCanvasKit       │
└──────────────────────────────┘            └────────────────────────────────┘
```

---

## 1. `@react-canvas/core` — ViewNode 场景树

### 1.1 ViewNode 结构

```typescript
class ViewNode {
  type: string; // 'View' (阶段二扩展 'Text'、阶段四扩展 'Image')
  yogaNode: YogaNode; // Yoga WASM 节点引用
  parent: ViewNode | null;
  children: ViewNode[];

  props: {
    backgroundColor?: string;
    borderRadius?: number;
    borderWidth?: number;
    borderColor?: string;
    opacity?: number;
    /** 与布局同步，供 paintNode 判断 `display: none` 分支（亦可从 yogaNode 读 Display） */
    display?: "flex" | "none";
  };

  layout: {
    left: number;
    top: number;
    width: number;
    height: number;
  };

  dirty: boolean;
}
```

- 构造时创建关联的 `Yoga.Node`，通过参数接收 Yoga 实例引用。
- `type` 字段为后续 Text / Image 扩展预留，阶段一只使用 `'View'`。
- `dirty`：`commitUpdate` 时置位，便于测试与后续优化。阶段一仍对根节点执行**整树** `calculateLayout` 与**整树**绘制，不因 `dirty` 跳过子树；增量布局仅依赖 Yoga 内部脏标记，增量绘制留待后续阶段。

### 1.2 style 处理

`setStyle(style)` 将 style 对象拆分为两部分：

- **布局属性** → 调用 `applyStylesToYoga(yogaNode, style)` 映射到 Yoga API
- **视觉属性** → 存入 `this.props`

`updateStyle(oldStyle, newStyle)` 用于差量更新：只对变化的属性调用 Yoga setter / 更新 props。与 Reconciler 的 `prepareUpdate → commitUpdate` 流程吻合。

### 1.3 布局属性映射

`applyStylesToYoga` 函数负责将 style 键名映射到 Yoga API 调用：

| style 属性                                                       | Yoga API                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `width` / `height`（**number** 或 **百分比字符串**，如 `'50%'`） | `setWidth()` / `setHeight()` 等；百分比语义相对**父布局盒**，根下第一层 `View` 相对 **`Canvas` 的 `width`/`height`** |
| `minWidth` / `maxWidth` / `minHeight` / `maxHeight`              | `setMinWidth()` 等                                                                                                   |
| `flex` / `flexGrow` / `flexShrink` / `flexBasis`                 | `setFlex()` 等                                                                                                       |
| `flexDirection`                                                  | `setFlexDirection()`                                                                                                 |
| `flexWrap`                                                       | `setFlexWrap()`                                                                                                      |
| `justifyContent` / `alignItems` / `alignSelf` / `alignContent`   | 对应 setter                                                                                                          |
| `margin` / `marginTop` 等                                        | `setMargin(edge, value)`                                                                                             |
| `padding` / `paddingTop` 等                                      | `setPadding(edge, value)`                                                                                            |
| `gap` / `rowGap` / `columnGap`                                   | `setGap()`                                                                                                           |
| `position` (`relative` / `absolute`)                             | `setPositionType()`                                                                                                  |
| `top` / `right` / `bottom` / `left`                              | `setPosition(edge, value)`                                                                                           |
| `display` (`flex` / `none`)                                      | `setDisplay()`                                                                                                       |
| `aspectRatio`                                                    | `setAspectRatio()`                                                                                                   |

Yoga 默认值对齐 React Native：`flexDirection: 'column'`、`flexShrink: 0`、`alignContent: 'flex-start'`（与 Web 默认 `stretch` 不同，实现时以 Yoga/RN 为准）。

### 1.4 树操作

```typescript
appendChild(child: ViewNode): void
  // 1. 设置 child.parent = this
  // 2. push to this.children
  // 3. this.yogaNode.insertChild(child.yogaNode, index)

removeChild(child: ViewNode): void
  // 1. this.yogaNode.removeChild(child.yogaNode)
  // 2. 从 this.children 中移除
  // 3. child.parent = null

insertBefore(child: ViewNode, before: ViewNode): void
  // 1. 计算 before 的 index
  // 2. 在 children 中插入
  // 3. this.yogaNode.insertChild(child.yogaNode, index)

destroy(): void
  // 递归释放所有子节点的 yogaNode.free()
  // 防止 WASM 内存泄漏
```

### 1.5 布局计算

```typescript
calculateLayout(width: number, height: number): void
  // 仅根节点调用
  // 1. this.yogaNode.calculateLayout(width, height, Direction.LTR)
  // 2. 递归遍历树，将每个 yogaNode 的 getComputedLeft/Top/Width/Height 写入 node.layout
```

增量布局依赖 Yoga 自身的脏标记机制：只有属性变化的节点才会重新计算。

---

## 2. `@react-canvas/core` — Skia 绘制管线

### 2.1 初始化

并行加载 Yoga WASM + CanvasKit WASM：

```typescript
const [yoga, canvasKit] = await Promise.all([
  initYoga(), // yoga-layout/wasm-async
  CanvasKitInit({ locateFile }), // canvaskit-wasm，locateFile 由 CanvasProvider props 传入
]);
```

`locateFile` 默认值为 `(file) => '/' + file`，用户可通过 `<CanvasProvider locateFile={...}>` 自定义 WASM 文件路径（CDN、自托管等场景）。

`CanvasProvider` 通过 React Context 暴露的**共享**运行时引用（每个文档树中一个 Provider 对应一份 WASM 运行时）：

```typescript
interface CanvasRuntimeContext {
  yoga: Yoga;
  canvasKit: CanvasKit;
}
```

**不包含 `Surface`。** 每个 `<Canvas>` 各自创建并持有 `Surface`（及绑定的 `<canvas>`、逻辑宽高、当前 DPR），以便同一 Provider 下挂载多个 Canvas。`Canvas` 从 Context 读取 `yoga` / `canvasKit`，在本地调用 `MakeCanvasSurface`。

### 2.2 Surface 创建

```typescript
const surface =
  canvasKit.MakeCanvasSurface(canvasElementId) ?? canvasKit.MakeSWCanvasSurface(canvasElementId);
```

`MakeCanvasSurface` 优先使用 WebGL2 硬件加速，降级到 `MakeSWCanvasSurface` 软件渲染。

### 2.3 DPR 处理

```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = logicalWidth * dpr;
canvas.height = logicalHeight * dpr;
canvas.style.width = logicalWidth + "px";
canvas.style.height = logicalHeight + "px";
```

Yoga 使用逻辑像素，布局结果不需要乘 DPR。CanvasKit Surface 创建后通过 `skCanvas.scale(dpr, dpr)` 在根节点做一次缩放。

DPR 变化监听：优先 `matchMedia('(resolution: Xdppx)')`；部分环境下拖拽窗口跨屏、浏览器缩放时该事件不可靠，可辅以 `window` `resize` 或 `visualViewport` 回调中**比较 `devicePixelRatio` 是否变化**，变化则重建 Surface 并重绘。

### 2.4 绘制流程

**单一帧入口：** 仅 `@react-canvas/react` 的 `queueLayoutPaintFrame` 调用 `surface.requestAnimationFrame`；`@react-canvas/core` 提供**同步**的 `paintScene`，由 rAF 回调在布局完成后调用，避免重复注册 rAF。

```
paintScene(root, skCanvas, canvasKit, dpr, paint)
  // 同步；不调用 requestAnimationFrame
  skCanvas.save()
  skCanvas.scale(dpr, dpr)
  skCanvas.clear(canvasKit.TRANSPARENT)
  paintNode(root, skCanvas, canvasKit, paint, 0, 0)
  skCanvas.restore()
```

```
paintNode(node, skCanvas, canvasKit, paint, offsetX, offsetY)
  1. x = offsetX + node.layout.left
     y = offsetY + node.layout.top
     w = node.layout.width
     h = node.layout.height

  2. `display: none`（Yoga `Display.None`）：不绘制本节点，且不递归子节点（实现上可在 ViewNode 缓存 `display` 或从 `yogaNode` 读取）。
     若 w <= 0 或 h <= 0：不绘制本节点背景与边框，但仍递归子节点（便于 `position: absolute` 子项等边界情况）。

  3. skCanvas.save()

  4. opacity 处理：
     如果 node.props.opacity < 1
       创建临时 layer：skCanvas.saveLayerPaint(paint with alpha)

  5. 绘制 backgroundColor（如有）：
     paint.setColor(canvasKit.parseColorString(backgroundColor))
     paint.setStyle(canvasKit.PaintStyle.Fill)
     rect = canvasKit.LTRBRect(x, y, x + w, y + h)
     如果 borderRadius > 0:
       rrect = canvasKit.RRectXY(rect, borderRadius, borderRadius)
       skCanvas.drawRRect(rrect, paint)
     否则:
       skCanvas.drawRect(rect, paint)

  6. 绘制 border（如有 borderWidth > 0）：
     paint.setStyle(canvasKit.PaintStyle.Stroke)
     paint.setStrokeWidth(borderWidth)
     paint.setColor(canvasKit.parseColorString(borderColor))
     skCanvas.drawRRect 或 drawRect(同上)

  7. 递归子节点：
     node.children.forEach(child => paintNode(child, skCanvas, canvasKit, paint, x, y))

  8. skCanvas.restore()
```

### 2.5 Paint 对象复用

在 `queueLayoutPaintFrame` 的 rAF 回调内创建一个 `Paint` 实例，传入 `paintScene`，贯穿整棵树的遍历。每次 `paintNode` 在使用前重置属性（color / style / strokeWidth），使用后由 `skCanvas.save/restore` 隔离状态。该帧结束后 `paint.delete()` 释放 WASM 内存。

`LTRBRect` 和 `RRectXY` 返回的是纯 JS 数组，不指向 WASM 内存，不需要手动释放。

### 2.6 资源释放

- `Paint` — 每帧绘制结束后 `delete()`
- `Surface` — `Canvas` 组件 unmount 时 `delete()`
- `ViewNode.yogaNode` — 节点从树中移除时 `free()`

---

## 3. `@react-canvas/react` — Reconciler 与组件

> **HostConfig 用途说明、流程与速查表**见 [hostconfig-guide.md](./hostconfig-guide.md)。**运行时结构约束（R-ROOT / R-HOST 等）的检测设计**见 [runtime-structure-constraints.md](./runtime-structure-constraints.md)。

### 3.1 HostConfig

| 方法                                            | 实现                                            |
| ----------------------------------------------- | ----------------------------------------------- |
| `createInstance(type, props)`                   | 创建 `ViewNode`，应用初始 style                 |
| `createTextInstance(text)`                      | 抛出错误（阶段一不支持裸文本）                  |
| `appendChild(parent, child)`                    | `parent.appendChild(child)`                     |
| `appendInitialChild(parent, child)`             | 同 `appendChild`                                |
| `removeChild(parent, child)`                    | `parent.removeChild(child)` + `child.destroy()` |
| `insertBefore(parent, child, before)`           | `parent.insertBefore(child, before)`            |
| `prepareUpdate(inst, type, oldProps, newProps)` | diff style，无变化返回 `null`                   |
| `commitUpdate(inst, payload)`                   | 差量更新 style + 标记 `dirty`                   |
| `finalizeInitialChildren()`                     | 返回 `false`                                    |
| `resetAfterCommit(container)`                   | 调用 `queueLayoutPaintFrame()`                  |
| `getChildHostContext(parentCtx)`                | 透传（为阶段二 Text 上下文预留）                |
| `shouldSetTextContent()`                        | 返回 `false`                                    |
| `supportsMutation`                              | `true`                                          |

阶段一 **`style` 仅支持对象**，不支持数组；`prepareUpdate` 中 `flattenStyle` 等价于 `style ?? {}`。与 RN 对齐的 **`style` 数组**留待后续阶段。

### 3.2 `prepareUpdate` — props diff

```typescript
function prepareUpdate(instance, type, oldProps, newProps) {
  const oldStyle = flattenStyle(oldProps.style);
  const newStyle = flattenStyle(newProps.style);
  const diff = diffStyles(oldStyle, newStyle);
  return diff ? { style: diff } : null;
}
```

`flattenStyle`：阶段一为 `props.style ?? {}`（不接受数组）。`diffStyles` 返回变化的 style 键值对，如果完全相同返回 `null`，`commitUpdate` 被跳过。

### 3.3 帧调度 — `queueLayoutPaintFrame`

> **`queueLayoutPaintFrame` 不是 `react-reconciler` 的 API**，而是 **@react-canvas/react** 内部辅助函数：在 `resetAfterCommit` 里调用；用模块级布尔值（示例中为 `layoutPaintFrameQueued`）去重后，向 `surface.requestAnimationFrame` 登记一帧，在回调里执行根上 `calculateLayout` → `paintScene`。

```typescript
let layoutPaintFrameQueued = false;

function queueLayoutPaintFrame(surface, canvasKit, rootNode, width, height, dpr) {
  if (layoutPaintFrameQueued) return;
  layoutPaintFrameQueued = true;
  surface.requestAnimationFrame((skCanvas) => {
    layoutPaintFrameQueued = false;
    rootNode.calculateLayout(width, height);
    const paint = new canvasKit.Paint();
    paint.setAntiAlias(true);
    paintScene(rootNode, skCanvas, canvasKit, dpr, paint);
    paint.delete();
  });
}
```

`paintScene` 来自 `core`（同步绘制，见 §2.4）。React 18 批处理下，同轮 commit 通常只调 **一次** `resetAfterCommit`；`layoutPaintFrameQueued` 去重后，每帧最多 **一次** rAF、一次布局与绘制。若 `flushSync` 等导致 **多轮** commit，则可能多次 `resetAfterCommit`，去重仍可避免 **同一帧内** 重复注册 rAF。

### 3.4 组件设计

**`CanvasProvider`**

```tsx
<CanvasProvider locateFile={(file) => `/wasm/${file}`}>
  {({ isReady, error }) =>
    isReady ? <Canvas ... /> : <div>Loading...</div>
  }
</CanvasProvider>
```

- 接受可选的 `locateFile` prop，控制 CanvasKit WASM 文件路径（默认 `(file) => '/' + file`）
- 内部并行加载 Yoga WASM + CanvasKit WASM
- 通过 React Context 将 `yoga` 和 `canvasKit` 实例传递给子组件（不包含 Surface，见 §2.1）
- render prop 暴露 `isReady`（初始化完成）和 `error`（初始化失败）
- 初始化只执行一次，多个 `<Canvas>` 可共享同一个 Provider

**`Canvas`**

```tsx
<Canvas width={400} height={300}>
  <View style={...} />
</Canvas>
```

- 从 Context 获取 `yoga` 和 `canvasKit`
- 渲染一个 `<canvas>` DOM 元素，设置物理尺寸 = 逻辑尺寸 × DPR；**优先用 `ref` 将 DOM 交给 CanvasKit 创建 Surface**；若当前 `canvaskit-wasm` API 仅支持字符串选择器，则使用 **组件内生成的唯一 `id`** 兜底
- **子节点：阶段一仅允许单个子节点，且须为 `<View>`**（多个并列须外包一层 `<View>`）；违反时须 **运行时抛错**（见 [runtime-structure-constraints.md](./runtime-structure-constraints.md)）
- 创建 CanvasKit Surface 绑定到该 canvas
- 创建 Reconciler 容器，children 通过 Reconciler 渲染到场景树
- 持有根 `ViewNode` + `queueLayoutPaintFrame` 逻辑
- unmount 时释放 Surface

**`View`**

`View` 不是一个真正的 React 组件，而是 JSX 中的宿主类型标识，由 Reconciler 的 `createInstance('View', props)` 处理。类似 react-dom 中的 `'div'`。

用户写 `<View style={...} />`，Reconciler 内部将 `'View'` 映射到 `ViewNode` 创建。

---

## 4. 测试策略

### 4.1 自动化测试 — headless 布局断言

在 `packages/core/tests/` 下编写测试（**`vp test`**），从 **`vite-plus/test`** 导入 `test` / `expect` / `describe` 等，纯 Node.js 环境：

**测试范围：**

| 类别     | 测试项                                                       |
| -------- | ------------------------------------------------------------ |
| 基础布局 | row / column 方向、flex 比例分配                             |
| 尺寸     | width / height / minWidth / maxWidth / minHeight / maxHeight |
| 间距     | margin / padding 各方向                                      |
| 对齐     | justifyContent / alignItems / alignSelf 各值                 |
| 高级     | gap / flexWrap / aspectRatio                                 |
| 定位     | position: absolute + top/right/bottom/left                   |
| 显示     | `display: 'none'`（Yoga `Display.None`）不参与绘制           |
| 嵌套     | 三层以上嵌套布局正确                                         |
| 差量更新 | style diff 产生正确的 updatePayload                          |
| 内存     | destroy() 后 yogaNode 被释放                                 |
| 百分比   | `width`/`height` 百分比相对父盒；首层相对 Canvas 逻辑尺寸    |

在 `packages/react/tests/` 下测试 Reconciler 集成（需要 jsdom 环境模拟 DOM）：

| 类别     | 测试项                                         |
| -------- | ---------------------------------------------- |
| 节点创建 | `<View>` 生成对应 ViewNode                     |
| 树结构   | 嵌套 `<View>` 生成正确的父子关系               |
| 更新     | props 变化触发 commitUpdate + dirty 标记       |
| 批处理   | 多次 setState 只触发一次 queueLayoutPaintFrame |
| 单子约束 | `<Canvas>` 多子或非法结构 **抛错**             |

**像素 / 图形回归：** [技术调研报告 §14](../core/technical-research.md) 建议的 dataURL 像素对比、在 Node 中跑完整 CanvasKit 管线等，对 CI 与 WASM 环境要求较高。**阶段一不列为必达**；以布局数值断言 + playground 人眼验收为主，像素级回归可在后续阶段或独立 harness（如浏览器/Playwright 截图）再引入。

### 4.2 可视化验证 — playground 页面

在 `apps/website` 中添加一个 playground 页面：

- 内嵌交互式 Canvas 渲染 demo
- 展示基础验收场景（嵌套 View、颜色、圆角、边框、透明度）
- 开发过程中人眼验证绘制效果
- 后续可作为库文档的一部分

---

## 5. 验收标准

阶段一完成时，以下场景必须正确工作：

```tsx
<CanvasProvider>
  {({ isReady }) =>
    isReady ? (
      <Canvas width={400} height={300}>
        <View style={{ flexDirection: "row", width: 200, height: 100 }}>
          <View style={{ flex: 1, backgroundColor: "red" }} />
          <View style={{ flex: 1, backgroundColor: "blue" }} />
        </View>
      </Canvas>
    ) : (
      <div>Loading...</div>
    )
  }
</CanvasProvider>
```

→ 两个 100×100 的矩形，红色在左蓝色在右，通过 CanvasKit 绘制在 Canvas 上。

**具体验收项：**

- [ ] 嵌套 View 在正确位置绘制
- [ ] Flexbox 布局结果与 React Native 一致（column 默认、flexShrink: 0）
- [ ] `borderRadius` 圆角正常显示
- [ ] `borderWidth` / `borderColor` 边框正常显示
- [ ] `opacity` 透明度正确
- [ ] 高分屏（Retina）上不模糊
- [ ] 连续多次 `setState` 只触发一次绘制
- [ ] headless 布局测试全部通过
- [ ] playground 页面可视化展示正常
