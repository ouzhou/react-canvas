# `@react-canvas/core` 重构设计文档

**日期：** 2026-04-09  
**状态：** 草案

---

## 设计方法论：从用户目标倒推 core 设计

**最终用户目标**：在 `@react-canvas/react` 层，开发者可以像写 React Native 一样写代码：

```tsx
// 用户写的代码 —— 这是设计的「北极星」
<CanvasProvider>
  {({ isReady }) =>
    isReady && (
      <Canvas width={800} height={600}>
        <View style={{ flex: 1, backgroundColor: "#f0f0f0", padding: 16 }}>
          <Text style={{ fontSize: 18, color: "#333", fontWeight: "bold" }}>Hello Canvas</Text>
          <Image source={{ uri: "..." }} style={{ width: 100, height: 100 }} />
          <ScrollView style={{ flex: 1 }}>
            <View style={{ height: 48, backgroundColor: "#fff" }} />
          </ScrollView>
        </View>
      </Canvas>
    )
  }
</CanvasProvider>
```

**core 的职责**：为 react reconciler 提供足够的底层能力，使上面的用法成为可能。core 本身也应该可以在纯 JS/TS 中独立使用，这里参考 Konva 的 Stage 初始化和独立调用风格（但节点模型完全不同——依然是 RN 的 View/Text/Image 等原语，而非 Konva 的 Rect/Circle/Shape）。

---

## 目录

1. [整体架构](#1-整体架构)
2. [Runtime — 运行时初始化](#2-runtime--运行时初始化)
3. [Stage — 画布宿主](#3-stage--画布宿主)
4. [Layer — 层系统](#4-layer--层系统)
5. [节点模型](#5-节点模型)
6. [布局引擎](#6-布局引擎)
7. [渲染管线](#7-渲染管线)
8. [事件系统](#8-事件系统)
9. [动画](#9-动画)
10. [帧调度器](#10-帧调度器)
11. [独立使用 API（JS/TS）](#11-独立使用-apijsts)
12. [包边界](#12-包边界)
13. [待决问题](#13-待决问题)
14. [伪类模拟系统](#14-伪类模拟系统)
15. [光标管理](#15-光标管理)
16. [Overflow 与 BorderRadius 实现](#16-overflow-与-borderradius-实现)
17. [嵌套滚动](#17-嵌套滚动)
18. [插件系统](#18-插件系统)

---

## 1. 整体架构

### 1.1 分层

```
用户代码
  │  <View> <Text> <Image> <ScrollView>   ← RN 风格
  ▼
@react-canvas/ui        主题、复合组件（Button/Dialog 等）、伪类 hooks
  │
  ▼
@react-canvas/react     React Reconciler + HostConfig + Provider/Canvas 组件
  │  createInstance / appendChild / commitUpdate ...
  ▼
@react-canvas/core      ← 本文档
  │  Stage / Layer / 节点 / 布局 / 渲染 / 事件 / 动画
  ▼
yoga-layout（WASM）  +  canvaskit-wasm（Skia）
```

### 1.2 RN 用法 → core 能力对应表

| RN 用法                                              | core 需要提供                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `<View style={{ flex:1, backgroundColor:'#fff' }}>`  | `ViewNode` + `ViewStyle`（Yoga 布局 + Skia 绘制）             |
| `<Text style={{ fontSize:16 }}>Hello</Text>`         | `TextNode` + `TextStyle`（Skia Paragraph + Yoga measureFunc） |
| `<Image source={{ uri }} style={{ width, height }}>` | `ImageNode`（异步解码 + SkImage 缓存）                        |
| `<ScrollView>`                                       | `ScrollViewNode`（overflow:scroll + 滚动偏移）                |
| `onPress` / `onPointerDown`                          | `InteractionHandlers`（命中测试 + 事件冒泡/捕获）             |
| `style={{ opacity: 0.5 }}`                           | `ViewStyle.opacity`（Skia saveLayer）                         |
| `style={{ overflow: 'hidden', borderRadius: 8 }}`    | `ViewStyle.overflow`（Skia clipRRect）→ §16                   |
| `style={{ zIndex: 10 }}`                             | `ViewStyle.zIndex`（绘制/命中排序）                           |
| `Modal` / `<Dialog>` 浮在最顶层                      | `Layer` 层系统（modalLayer）+ 事件阻断                        |
| `Animated.Value` 绑定 style                          | `Ticker` 帧驱动 + `stage.requestPaint()`                      |
| `position: absolute` 定位                            | Yoga absolute 布局                                            |
| `:hover` / `:active` / `:focus` 伪类                 | `InteractionState` + `_hover`/`_active` 样式 → §14            |
| `cursor: pointer`                                    | `CursorManager`（优先级栈：node < plugin < system）→ §15      |
| 嵌套 ScrollView scroll chaining                      | `consumeScroll` 链式分发 + `overscrollBehavior` → §17         |
| 插件（viewport/inspector/keyboard）                  | `Plugin` 接口 + `PluginContext` + `Stage.use()` → §18         |

---

## 2. Runtime — 运行时初始化

### 2.1 问题

Yoga 和 CanvasKit 都是 WASM，需要异步加载。这是与普通 JS 库最大的不同——无法同步 `new Stage()`。

当前实现已经很合理：单例 Promise + 订阅接口。重构只做接口名统一。

### 2.2 接口

```ts
export type Runtime = {
  yoga: Yoga;
  canvasKit: CanvasKit;
};

export type RuntimeOptions = {
  /** 默认 true：加载内置 CJK 字体 */
  loadDefaultParagraphFonts?: boolean;
  /** 覆盖内置字体 URL */
  defaultParagraphFontUrl?: string;
};

/**
 * 初始化 Yoga + CanvasKit + 默认字体。
 * 模块级单例：多次调用安全，第一次调用的 options 生效。
 */
export function initRuntime(options?: RuntimeOptions): Promise<Runtime>;

// React useSyncExternalStore 适配（react 包内使用）
export function subscribeRuntimeInit(cb: () => void): () => void;
export function getRuntimeSnapshot(): RuntimeInitSnapshot;
export function getRuntimeServerSnapshot(): RuntimeInitSnapshot;

export type RuntimeInitSnapshot =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; runtime: Runtime }
  | { status: "error"; error: Error };
```

### 2.3 react 包如何使用

```tsx
// CanvasProvider 内部
useEffect(() => {
  void initRuntime(options);
}, []);
const snap = useSyncExternalStore(
  subscribeRuntimeInit,
  getRuntimeSnapshot,
  getRuntimeServerSnapshot,
);
// snap.status === 'ready' 时将 runtime 注入 Context
```

---

## 3. Stage — 画布宿主

### 3.1 为什么要有 Stage

**当前最大问题**：Surface 创建、帧调度、DOM 事件绑定分散在 react 包的 `Canvas.tsx` / `canvas-backing-store.ts` / `frame-queue.ts` / `attachCanvasPointerHandlers` 里，core 无法独立使用。

Stage 是这些职责的统一归口。参考 Konva 的 `Stage`：它持有 canvas 元素、管理 Layer、负责渲染循环。区别是我们的 Stage 里的节点是 RN 原语而非绘图图元。

### 3.2 Stage 职责

```
Stage
 ├── Surface（Skia）         从 <canvas> 创建，resize 时重建
 ├── FrameScheduler          每个 Stage 独立，requestLayout / requestPaint
 ├── Layer[]                 按 zIndex 排序，每层独立 Yoga 根
 └── EventDispatcher         绑定 canvas DOM 事件，按层逆序做 hitTest 分发
```

### 3.3 API

```ts
export type StageOptions = {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  width: number;
  height: number;
  dpr?: number; // 默认 window.devicePixelRatio ?? 1
  camera?: ViewportCamera | null; // 视口平移/缩放
};

export class Stage {
  constructor(runtime: Runtime, options: StageOptions);

  // Layer 管理
  createLayer(options?: LayerOptions): Layer;
  removeLayer(layer: Layer): void;
  readonly layers: readonly Layer[];

  // 内置 Layer（总是存在）
  readonly defaultLayer: Layer; // zIndex = 0，普通内容
  readonly overlayLayer: Layer; // zIndex = 100，tooltip/dropdown
  readonly modalLayer: Layer; // zIndex = 1000，modal/dialog，默认 captureEvents=true

  // 尺寸
  resize(width: number, height: number, dpr?: number): void;
  readonly width: number;
  readonly height: number;
  readonly dpr: number;

  // 相机
  setCamera(camera: ViewportCamera | null): void;

  // 帧调度（外部触发）
  requestLayout(): void; // 下一帧重跑 Yoga + 重绘
  requestPaint(): void; // 下一帧仅重绘

  // Ticker 工厂
  createTicker(): Ticker;

  // 生命周期
  destroy(): void;

  // 内部接口（react 包使用）
  readonly surface: Surface;
  readonly runtime: Runtime;
}
```

### 3.4 react 包中 `<Canvas>` 的对应关系

```
<Canvas width height>  →  new Stage(runtime, { canvas, width, height })
                           stage.defaultLayer.root 作为 Reconciler 的 container
resize prop 变化       →  stage.resize(...)
组件卸载               →  stage.destroy()
```

---

## 4. Layer — 层系统

### 4.1 为什么需要 Layer

RN 中 `Modal` 可以脱离当前组件树渲染到最顶层，且打开时底层不响应触摸。用单一场景树 + `zIndex` 数字无法可靠实现这一点（数字需要全局协调，且无法阻断低层事件）。

Layer 是解决 **渲染层级** 和 **事件阻断** 的机制。

| RN/Web 概念                | Layer 对应                                           |
| -------------------------- | ---------------------------------------------------- |
| 普通内容                   | `defaultLayer`（zIndex=0）                           |
| Tooltip、Dropdown、Popover | `overlayLayer`（zIndex=100）                         |
| Modal、Dialog、全屏遮罩    | `modalLayer`（zIndex=1000，默认 captureEvents=true） |
| 自定义层（如调试用）       | `stage.createLayer({ zIndex: n })`                   |

### 4.2 Layer API

```ts
export type LayerOptions = {
  zIndex?: number;
  /** true：此层命中后停止向低层传递事件；未命中也停止（Modal 语义）。 */
  captureEvents?: boolean;
  visible?: boolean;
};

export class Layer {
  /** 全屏根节点（position: absolute, width: 100%, height: 100%） */
  readonly root: ViewNode;

  zIndex: number;
  captureEvents: boolean;
  visible: boolean;

  /** 将节点挂到该层的根下 */
  add(node: ViewNode): this;
  remove(node: ViewNode): this;

  readonly stage: Stage;
}
```

### 4.3 Modal 场景完整流程

```
用户打开 Modal
  │
  ├── ui 包 Dialog 组件：将 modal ViewNode 挂到 stage.modalLayer
  ├── stage.modalLayer.captureEvents = true   ← 阻断底层所有事件
  └── stage.requestLayout()

用户关闭 Modal
  ├── 从 modalLayer 移除 modal ViewNode
  ├── stage.modalLayer.captureEvents = false
  └── stage.requestLayout()
```

### 4.4 Portal 不是独立 API

"Portal" 的本质就是**把节点挂到不同 Layer**。React 包里的 `createPortal` 实现也是如此：

```
createPortal(children, portalContainer)
  └── portalContainer 是某个 Layer 上 react 创建的 reconciler 根
      → appendChildToContainer 把节点挂到该 Layer 的 root
```

### 4.5 Layer 内 zIndex

同一 Layer 内的节点仍可用 `style.zIndex` 做微调排序（现有逻辑保留）。Layer 级别的排序由 `layer.zIndex` 决定。

---

## 5. 节点模型

### 5.1 节点类型与 RN 原语对应

```
ViewNode        对应 RN <View>         通用 flex 容器
TextNode        对应 RN <Text>         文字，Skia Paragraph，Yoga measureFunc
ImageNode       对应 RN <Image>        图片，异步解码，SkImage 缓存
ScrollViewNode  对应 RN <ScrollView>   可滚动容器，extends ViewNode
SvgPathNode     对应 RN <Svg>/<Path>   SVG 路径，d + viewBox
CustomNode      无直接对应              低级 Skia 绘制逃生舱，非主路径
```

**设计原则**：用户（包括 react 层用户）通过 `ViewStyle` 描述外观，不直接操作 Skia。`CustomNode` 存在是为了覆盖 `ViewStyle` 无法描述的极少数场景（折线图、自定义波形等）。

### 5.2 ViewNode

```ts
export class ViewNode {
  readonly type: string;
  readonly yogaNode: YogaNode;

  parent: ViewNode | null;
  readonly children: SceneNode[];
  layout: Rect; // { left, top, width, height }，Yoga 计算后写入

  // 样式（外观 + 布局一体化）
  setStyle(style: ViewStyle): void;
  updateStyle(prev: ViewStyle, next: ViewStyle): void; // diff 更新，reconciler 用

  // 事件（RN onPress 心智：直接赋值整个 handlers 对象）
  interactionHandlers: InteractionHandlers;

  // 子树操作
  appendChild(child: SceneNode): void;
  removeChild(child: SceneNode): void;
  insertBefore(child: SceneNode, before: SceneNode): void;

  // 脏标记（由 setStyle / updateStyle 内部维护）
  dirtyLevel: "none" | "paint" | "layout";
  markDirty(level: "paint" | "layout"): void; // 向上冒泡到 Layer

  destroy(): void;
}
```

### 5.3 TextNode

TextNode 是 Yoga 叶节点，通过 `setMeasureFunc` 让 Yoga 在布局时测量文字尺寸。

```ts
export class TextNode extends ViewNode {
  // 文字样式（字体、行高等；布局样式继承父类 ViewStyle）
  textProps: TextOnlyProps;

  // 内容：可以是字符串叶子节点或嵌套 TextNode（RN <Text> 嵌套 <Text>）
  slots: TextSlot[]; // TextSlot = { kind: 'string', ref } | { kind: 'text', node }

  setStyle(style: TextStyle): void;
}
```

**RN 嵌套 Text 规则**（与当前实现一致）：

- `<Text>` 内可嵌套 `<Text>`（内联样式）
- `<Text>` 内**禁止** `<View>`
- `<View>` 内**禁止**裸字符串

### 5.4 ImageNode

```ts
export class ImageNode extends ViewNode {
  sourceUri: string;
  resizeMode: ResizeMode; // 'cover' | 'contain' | 'stretch' | 'center'
  skImage: SkImage | null;
  loadState: "idle" | "loading" | "loaded" | "error";
  onLoad?: () => void;
  onError?: (e: unknown) => void;

  load(canvasKit: CanvasKit): void; // 触发异步解码
  abortLoad(): void;
}
```

### 5.5 ScrollViewNode

```ts
export class ScrollViewNode extends ViewNode {
  scrollX: number;
  scrollY: number;
  scrollbarHoverVisible: boolean;

  // 约束在合法范围内
  clampScrollOffsetsAfterLayout(): void;
}
```

Yoga 侧设置 `Overflow.Scroll`，`overflow: 'hidden'` 用 Skia clipRect 裁剪子内容，绘制时对子节点应用 `translate(-scrollX, -scrollY)`。

### 5.6 CustomNode（低级逃生舱）

```ts
export type CustomPaintContext = {
  skCanvas: Canvas;
  canvasKit: CanvasKit;
  layout: Rect; // 局部坐标，{0,0} 为节点左上角
  paint: Paint; // 共享 Paint，每次使用前设置所需属性
};

export class CustomNode extends ViewNode {
  paintFn: ((ctx: CustomPaintContext) => void) | null;
}
```

React 包对应：`<Custom style={...} onPaint={fn} />`

### 5.7 SceneNode 类型 Union

```ts
export type SceneNode = ViewNode | TextNode | ImageNode | SvgPathNode | ScrollViewNode | CustomNode;
```

**当前问题**：`scene-node.ts` 只有 `ViewNode | TextNode`，需扩展。

---

## 6. 布局引擎

### 6.1 现状问题

- `calculateLayoutRoot` 每帧对整棵树全量运行 Yoga —— 无脏节点过滤
- `node.dirty` 置 true 后从未被读取，帧调度器不知道是否需要重跑 layout

### 6.2 两级脏标记

```ts
type DirtyLevel = "none" | "paint" | "layout";
```

| 发生什么                                                         | DirtyLevel |
| ---------------------------------------------------------------- | ---------- |
| `backgroundColor`, `opacity`, `borderColor`, `borderRadius` 变化 | `paint`    |
| `transform`, `zIndex` 变化                                       | `paint`    |
| `width`, `height`, `flex*`, `margin`, `padding`, `gap` 变化      | `layout`   |
| `display` 变化                                                   | `layout`   |
| `position`, `top/left/right/bottom` 变化                         | `layout`   |

`markDirty` 向上冒泡到 Layer，Layer 记录 `needsLayout` 或 `needsPaint`，FrameScheduler 据此决定当前帧是否需要运行 Yoga。

### 6.3 对外 API

```ts
// 内部：每个 Layer 独立计算
function calculateLayoutLayer(root: ViewNode, w: number, h: number, ck: CanvasKit): void;

// 测试 / 命令式使用
export function forceLayout(root: ViewNode, w: number, h: number): void;
```

---

## 7. 渲染管线

### 7.1 每帧流程

```
FrameScheduler.tick(doLayout: boolean)
  │
  ├─ if doLayout:
  │    for each layer:
  │      calculateLayoutLayer(layer.root, stage.width, stage.height)
  │
  └─ 绘制：
       skCanvas.save()
       scale(dpr, dpr)
       clear(TRANSPARENT)
       if camera: concat(cameraMatrix)
       for each layer (zIndex 升序):
         if layer.visible:
           paintNode(layer.root, skCanvas, canvasKit, paint)
       skCanvas.restore()
       surface.flush()
```

### 7.2 paintNode 逻辑

```
paintNode(node):
  if display:none → return
  save + concat(translate(layout.left, layout.top) * localTransform)

  if opacity < 1 → saveLayer(alphaPaint)
  if overflow:hidden → clipRRect(borderRadius)

  // 背景
  if backgroundColor → drawRect/RRect
  if backgroundGradient → drawRect with Shader（阶段五）

  // 边框
  if borderWidth > 0 → drawRect/RRect (Stroke)

  // 阴影
  if boxShadow → saveLayer with ImageFilter.MakeDropShadow（阶段五）

  // 节点类型特定绘制
  switch node.type:
    'Text'         → buildParagraph + paragraph.paint
    'Image'        → drawImageRect (resizeMode 变换)
    'SvgPath'      → drawPath (viewBox 等比变换)
    'ScrollView'   → translate(-scrollX, -scrollY) 裁剪后绘子节点 + 绘滚动条
    'Custom'       → node.paintFn({ skCanvas, canvasKit, layout, paint })
    default        → 绘子节点（按 zIndex 排序）

  restore
```

### 7.3 ViewStyle 扩展（阶段五）

当前 `ViewStyle` 缺少的能力，统一纳入 `ViewStyle` 传递（react 包的 `style` prop 直接支持）：

```ts
// 阴影
boxShadow?: {
  offsetX: number; offsetY: number;
  blur: number; spread?: number;
  color: string; inset?: boolean;
};

// 渐变背景
backgroundGradient?: {
  type: 'linear' | 'radial';
  colors: string[];
  stops?: number[];          // 默认均匀分布
  angle?: number;            // linear 用，单位 deg
  center?: [number, number]; // radial 用，默认 [0.5, 0.5]
  radius?: number;           // radial 用
};
```

---

## 8. 事件系统

### 8.1 从 RN 事件模型推导

RN 中事件是 props：`onPress`、`onPressIn`、`onPressOut`，内部由手势系统处理。我们的 core 同样以 **props 赋值** 为主接口，不是 `.addEventListener`。

```ts
// RN 风格：整体替换 handlers 对象（与 reconciler commitUpdate 一致）
node.interactionHandlers = {
  onClick: handlePress,
  onPointerEnter: handleHoverIn,
  onPointerLeave: handleHoverOut,
};
```

### 8.2 当前问题

- 只有冒泡，无捕获 → 无法在父节点拦截子节点事件
- 无 Layer 级事件阻断 → Modal 打开时底层仍可点击
- 无 PointerCapture → 拖拽超出节点范围时丢失事件
- 图片异步解码完成后触发的 `requestRedrawFromImage` 是全局广播，不属于任何 Stage

### 8.3 事件分发流程

```
canvas DOM 事件（pointermove / pointerdown / pointerup / wheel）
  │
  └── Stage.EventDispatcher
        │
        1. 坐标转换：DOM 坐标 → 逻辑坐标（dpr + camera 逆变换）
        │
        2. Layer 遍历（zIndex 逆序，高层优先）
        │  for each layer (high → low):
        │    hitNode = hitTest(layer.root, x, y, canvasKit)
        │    if hitNode:
        │      dispatchEvent(path, hitNode, event)
        │      if layer.captureEvents: break  ← 不继续低层
        │    else if layer.captureEvents: break  ← 空白处也阻断
        │
        3. hover 状态：diff 前后命中节点 → pointerenter / pointerleave
        │
        4. wheel → 找最近 ScrollViewNode 祖先 → 更新 scrollY → requestPaint
```

### 8.4 Dispatch：捕获 + 冒泡

```ts
function dispatchEvent(path: ViewNode[], event: CanvasSyntheticPointerEvent): void {
  // 捕获阶段：root → parent of target
  for (let i = 0; i < path.length - 1; i++) {
    const h = path[i]!.interactionHandlers;
    callCaptureHandler(h, event);
    if (event.stopped) return;
  }
  // 目标 + 冒泡：target → root
  for (let i = path.length - 1; i >= 0; i--) {
    const h = path[i]!.interactionHandlers;
    callBubbleHandler(h, event);
    if (event.stopped) return;
  }
}
```

### 8.5 InteractionHandlers 完整定义

```ts
type Handler = (e: CanvasSyntheticPointerEvent) => void;

export type InteractionHandlers = {
  // 冒泡（现有 + 保持 RN 命名风格）
  onClick?: Handler;
  onPointerDown?: Handler;
  onPointerUp?: Handler;
  onPointerMove?: Handler;
  onPointerEnter?: Handler; // 合成，不冒泡
  onPointerLeave?: Handler; // 合成，不冒泡

  // 捕获（新增）
  onClickCapture?: Handler;
  onPointerDownCapture?: Handler;
  onPointerUpCapture?: Handler;
  onPointerMoveCapture?: Handler;
};
```

### 8.6 PointerCapture

用于拖拽：鼠标按下后，即使移出节点范围，pointermove / pointerup 仍发送到该节点。

```ts
// Stage 上
stage.setPointerCapture(node: ViewNode, pointerId: number): void;
stage.releasePointerCapture(node: ViewNode, pointerId: number): void;

// 激活后：对应 pointerId 的 pointermove/pointerup 跳过 hitTest，直接 dispatch 到捕获节点
```

---

## 9. 动画

### 9.1 设计原则

RN 动画的心智是 `Animated.Value` 绑定到 style，或在 `useAnimatedValue` 里每帧修改值。core 同理：动画的本质是**每帧修改节点的 style 属性**，然后通知 Stage 重绘。

core 只提供最小的 `Ticker`（帧驱动器）。react 包可直接对接 `react-spring` / `framer-motion` 等——它们在每帧回调里调用 `node.updateStyle(prev, next)` + `stage.requestPaint()` 即可。

```
动画运行路径：
  Ticker.add(callback)
    → rAF 每帧执行 callback(deltaMs)
    → callback 内：node.updateStyle(prev, next)  →  markDirty('paint')
    → stage.requestPaint()
    → FrameScheduler 下一帧只做 paint（无 layout 开销）
```

`transform` 动画不触发 layout，`width`/`height` 动画触发 layout——与 RN `useNativeDriver` 的区分逻辑一致。

### 9.2 Ticker

```ts
export class Ticker {
  /** stage 持有，生命周期与 stage 绑定 */
  constructor(stage: Stage);

  /**
   * 添加每帧回调。
   * 返回 false 或 void：继续下一帧。
   * 返回 true：动画完成，自动移除该回调。
   */
  add(fn: (deltaMs: number, now: number) => boolean | void): () => void;
  remove(fn: Function): void;

  start(): void;
  stop(): void;
  readonly running: boolean;
  destroy(): void;
}

// Stage 上
stage.createTicker(): Ticker;
```

---

## 10. 帧调度器

### 10.1 现状问题

`frame-queue.ts` 用模块级 `WeakMap<Surface, State>` 管理，所有 Stage 共享模块状态，无法干净销毁，`requestRedrawFromImage` 是全局广播。

### 10.2 每个 Stage 一个 FrameScheduler

```ts
class FrameScheduler {
  private needsLayout = false;
  private needsPaint = false;
  private rafId: number | null = null;

  requestLayout(): void {
    this.needsLayout = true;
    this.needsPaint = true;
    this.schedule();
  }

  requestPaint(): void {
    this.needsPaint = true;
    this.schedule();
  }

  private schedule(): void {
    if (this.rafId !== null) return;   // 已在队列中，合并到同一帧
    this.rafId = this.surface.requestAnimationFrame((skCanvas) => {
      this.rafId = null;
      const doLayout = this.needsLayout;
      this.needsLayout = false;
      this.needsPaint = false;
      this.tick(skCanvas, doLayout);
    });
  }

  private tick(skCanvas: SkCanvas, doLayout: boolean): void {
    if (doLayout) {
      for (const layer of this.stage.layers) {
        if (layer.needsLayout) calculateLayoutLayer(layer.root, ...);
      }
    }
    paintAllLayers(this.stage, skCanvas);
    this.stage.surface.flush();
  }

  destroy(): void {
    if (this.rafId !== null) this.surface.cancelAnimationFrame(this.rafId);
  }
}
```

### 10.3 外部触发来源汇总

| 触发来源                             | 调用                                               |
| ------------------------------------ | -------------------------------------------------- |
| react `commitUpdate` / `commitMount` | `stage.requestLayout()`                            |
| `node.updateStyle`（layout 属性）    | `markDirty('layout')` → `stage.requestLayout()`    |
| `node.updateStyle`（paint 属性）     | `markDirty('paint')` → `stage.requestPaint()`      |
| ImageNode 异步解码完成               | `stage.requestPaint()`（属于该 Stage，不全局广播） |
| ScrollView 滚轮 / 拖拽               | `stage.requestPaint()`                             |
| `stage.resize()`                     | `stage.requestLayout()`                            |
| Ticker 回调                          | `stage.requestPaint()` 或 `stage.requestLayout()`  |
| 首次字体加载完成                     | `stage.requestLayout()`（所有已存在的 Stage）      |

---

## 11. 独立使用 API（JS/TS）

core 可以在无 React 环境中独立运行。调用风格参考 Konva 的简洁性（`await init → new Stage → 创建节点 → 挂到 layer`），但节点是 RN 原语而非绘图图元。

```ts
import {
  initRuntime,
  Stage,
  ViewNode,
  TextNode,
  ImageNode,
  ScrollViewNode,
} from "@react-canvas/core";

// 1. 等待 WASM 加载（与 Konva 的唯一区别：必须 await）
const runtime = await initRuntime();
const { yoga, canvasKit } = runtime;

// 2. 创建 Stage，绑定 canvas
const stage = new Stage(runtime, {
  canvas: document.getElementById("canvas") as HTMLCanvasElement,
  width: 800,
  height: 600,
});

// 3. 创建节点 —— RN style 驱动，不手动设置 x/y
const card = new ViewNode(yoga);
card.setStyle({
  width: 300,
  height: 200,
  backgroundColor: "#ffffff",
  borderRadius: 12,
  padding: 16,
  flexDirection: "column",
  gap: 8,
});
card.interactionHandlers = {
  onClick: (e) => console.log("clicked", e.pageX, e.pageY),
};

const title = new TextNode(yoga);
title.setStyle({ fontSize: 16, fontWeight: "bold", color: "#222" });
title.setTextContent("Hello");

const sub = new TextNode(yoga);
sub.setStyle({ fontSize: 13, color: "#666" });
sub.setTextContent("World");

card.appendChild(title);
card.appendChild(sub);

// 4. 挂到默认 Layer
stage.defaultLayer.add(card);

// 5. 滚动列表
const list = new ScrollViewNode(yoga);
list.setStyle({ width: 300, height: 400 });
for (let i = 0; i < 30; i++) {
  const item = new ViewNode(yoga);
  item.setStyle({
    height: 44,
    borderWidth: 1,
    borderColor: "#eee",
    padding: 12,
  });
  list.appendChild(item);
}
stage.defaultLayer.add(list);

// 6. Modal（modalLayer，自动 captureEvents）
const backdrop = new ViewNode(yoga);
backdrop.setStyle({
  position: "absolute",
  top: 0,
  left: 0,
  width: 800,
  height: 600,
  backgroundColor: "rgba(0,0,0,0.5)",
});
backdrop.interactionHandlers = { onClick: closeModal };

const modal = new ViewNode(yoga);
modal.setStyle({
  position: "absolute",
  top: 200,
  left: 200,
  width: 400,
  height: 200,
  backgroundColor: "#fff",
  borderRadius: 8,
});
backdrop.appendChild(modal);
stage.modalLayer.add(backdrop);
// modalLayer 默认 captureEvents = true，无需手动设置

// 7. 动画（Ticker 帧驱动）
const ticker = stage.createTicker();
let start: number | null = null;
ticker.add((delta, now) => {
  start ??= now;
  const t = Math.min((now - start) / 400, 1);
  card.updateStyle({ opacity: 0 }, { opacity: t });
  stage.requestPaint();
  return t >= 1; // 返回 true 表示完成，自动移除
});

// 8. 销毁
stage.destroy();
```

---

## 12. 包边界

### 12.1 重构后职责

| 包                    | 职责                                                               | 注意              |
| --------------------- | ------------------------------------------------------------------ | ----------------- |
| `@react-canvas/core`  | Runtime / Stage / Layer / 节点 / 布局 / 渲染 / 事件 / Ticker       | **无 React 依赖** |
| `@react-canvas/react` | Reconciler HostConfig / CanvasProvider（Context）/ `<Canvas>` 组件 | 薄封装，调用 core |
| `@react-canvas/ui`    | 主题 Token / CanvasThemeProvider / 复合组件 / 伪类 hooks           | 依赖 react 包     |

### 12.2 当前需要从 react 包迁移到 core 的内容

| 现在在 react 包                               | 应该在 core                             |
| --------------------------------------------- | --------------------------------------- |
| `canvas-backing-store.ts`（Surface 创建）     | `Stage` 内部                            |
| `frame-queue.ts`（帧调度）                    | `Stage.FrameScheduler`                  |
| `attachCanvasPointerHandlers`（DOM 事件绑定） | `Stage.EventDispatcher`                 |
| `paint-frame-requester.ts`（全局广播）        | `Stage.requestPaint()`（按 Stage 隔离） |
| `overlay-z-index.tsx`（浮层 z 分配）          | 删除，被 `Layer` 取代                   |

### 12.3 react 包重构后的职责边界

```
CanvasProvider
  └── 调用 initRuntime() → 注入到 CanvasRuntimeContext

<Canvas width height>
  └── new Stage(runtime, { canvas, width, height })
  └── stage.defaultLayer 对应 Reconciler 的 container root
  └── resize → stage.resize()
  └── unmount → stage.destroy()

HostConfig
  createInstance   → new ViewNode(yoga) / new TextNode(yoga) / ...
  appendChild      → parent.appendChild(child)
  commitUpdate     → node.updateStyle(prev, next); stage.requestLayout()
  commitMount      → stage.requestLayout()

Portal
  createPortal(children, layerContainer)
  └── layerContainer = stage.overlayLayer 或 stage.modalLayer 上的 reconciler 根
```

---

## 13. 待决问题

### 13.1 Layer 上的 Reconciler 根

多 Layer 时，react 包需要为每个 Layer 维护独立的 Reconciler 根（`ReactReconciler.createContainer`），还是共用一个根只区分挂载 container？

> **建议**：每个 Layer 用独立的 Reconciler 根，这样 Portal 的语义最清晰（`createPortal` 的 `container` 就是对应 Layer 的根容器，与 ReactDOM.createPortal 概念对齐）。

### 13.2 Portal 的 Layer 自动管理

`ui` 包的 `Dialog` 组件需要动态把内容放到 `modalLayer`，关闭时移除，同时管理 `captureEvents`。这需要 react 包暴露获取 Stage 当前 Layer 的 hook：

```ts
// react 包暴露
function useStageLayer(type: "default" | "overlay" | "modal"): Layer;
```

> **待决**：是通过 Context 传递 Stage 实例，还是分别传递各个 Layer？

### 13.3 跨 Layer 坐标定位

Tooltip 需要锚定到某个 `defaultLayer` 节点的位置后再渲染到 `overlayLayer`。需要坐标转换工具：

```ts
// 将节点的世界坐标转换为 Stage 逻辑坐标
stage.getNodeWorldRect(node: ViewNode): Rect;
// 然后在 overlayLayer 里用 position: absolute + top/left 定位
```

### 13.4 水平滚动

`ScrollViewNode` 当前只支持垂直滚动。水平滚动需要：

- Yoga：`flexDirection: row` 的内容容器
- wheel 事件：区分 `deltaX` / `deltaY`
- 触摸手势：区分横/纵滑动意图（防止冲突）

> **待决**：`horizontal?: boolean` prop，还是自动检测滚动方向？

### 13.5 PointerCapture 节点标识

`stage.setPointerCapture(node, pointerId)` 需要节点有稳定标识。

> **建议**：`ViewNode` 构造时分配 `readonly id: symbol`，Stage 用 `Map<symbol, ViewNode>` 维护 capture 状态。

### 13.6 首帧 Text 抖动

字体异步加载完成后触发 `stage.requestLayout()`，会导致首帧文字位置跳动。

> **待决**：`stage.waitForReady(): Promise<void>`（等字体加载完再首次绘制），还是接受首帧抖动？

### 13.7 `node.currentStyle`

`updateStyle(prev, next)` 需要传入 prev。命令式使用时，用户需要自己持有样式对象。是否应在 `ViewNode` 上缓存 `currentStyle`：

```ts
// 如果缓存
card.setStyle({ opacity: 1 });
card.updateStyle(card.currentStyle, { ...card.currentStyle, opacity: 0.5 });

// 对比：reconciler 路径不需要，因为 react 已持有 prev/next props
```

---

## 14. 伪类模拟系统

### 14.1 问题

CSS 有 `:hover`、`:active`、`:focus`、`:disabled` 伪类，选择器自动把交互状态映射为样式变化。Canvas 没有 CSS——所有交互状态必须手动追踪、手动切换样式。

当前 ui 包做法：每个组件用 `useState(false)` 追踪 hover/pressed，在 `onPointerEnter`/`onPointerLeave` 里 setState，再在 style 里做条件合并。这对每个组件都要写一遍，冗余且容易遗漏。

```tsx
// 现状：每个组件都重复这段逻辑
const [hovered, setHovered] = useState(false);
const [pressed, setPressed] = useState(false);
<View
  style={{ ...base, ...(hovered && hoverPatch), ...(pressed && pressPatch) }}
  onPointerEnter={() => setHovered(true)}
  onPointerLeave={() => {
    setHovered(false);
    setPressed(false);
  }}
  onPointerDown={() => setPressed(true)}
  onPointerUp={() => setPressed(false)}
/>;
```

### 14.2 设计：三层协作

```
core    →  节点维护 interactionState 位标记（hover / pressed / focused）
react   →  暴露 useInteractionState() hook，useSyncExternalStore 订阅变化
ui      →  提供 Pressable 组件 + useStyleWithState() 便捷 hook
```

### 14.3 core 层：InteractionState

在 `ViewNode` 上维护一个 **只读** 的位标记结构，由 `EventDispatcher` 自动维护：

```ts
export type InteractionState = {
  readonly hovered: boolean; // 指针在节点范围内
  readonly pressed: boolean; // pointerdown 后未 pointerup
  readonly focused: boolean; // 通过 FocusManager 获得焦点
};

export class ViewNode {
  // ... 现有字段 ...

  /** 由 EventDispatcher 内部写入，外部只读 */
  readonly interactionState: InteractionState = {
    hovered: false,
    pressed: false,
    focused: false,
  };

  /** 状态变化回调，react 包用来触发 re-render */
  onInteractionStateChange?: (state: InteractionState) => void;
}
```

**EventDispatcher 自动维护逻辑**：

```
pointermove 命中新节点:
  ├── 旧 hover 链上的节点：hovered = false → 触发 onInteractionStateChange
  └── 新 hover 链上的节点：hovered = true  → 触发 onInteractionStateChange

pointerdown 命中节点:
  └── 目标节点：pressed = true → 触发 onInteractionStateChange

pointerup:
  └── 先前 pressed 的节点：pressed = false → 触发 onInteractionStateChange

// focus 由 FocusManager 单独管理（见下文）
```

### 14.4 core 层：FocusManager

Canvas 没有原生 focus 机制。需要一个 Stage 级的焦点管理器：

```ts
export class FocusManager {
  constructor(stage: Stage);

  /** 当前获得焦点的节点 */
  readonly focusedNode: ViewNode | null;

  /** 转移焦点 */
  focus(node: ViewNode): void;

  /** 释放焦点 */
  blur(): void;

  /** Tab 顺序导航（可选，未来扩展） */
  focusNext(): void;
  focusPrev(): void;
}
```

`focus()` 的完整流程：

```
focus(nextNode):
  prev = this.focusedNode
  if prev === nextNode → return
  if prev:
    prev.interactionState.focused = false
    prev.onInteractionStateChange?.(prev.interactionState)
  this.focusedNode = nextNode
  nextNode.interactionState.focused = true
  nextNode.onInteractionStateChange?.(nextNode.interactionState)
```

**与事件系统集成**：`EventDispatcher` 在 `pointerdown` 时自动调用 `focusManager.focus(hitNode)`——点击即聚焦，与浏览器行为一致。节点可以通过 `focusable: boolean` prop 控制是否可聚焦。

### 14.5 react 层：useInteractionState

```ts
// @react-canvas/react 暴露
function useInteractionState(nodeRef: React.RefObject<ViewNode>): InteractionState {
  return useSyncExternalStore(
    (cb) => {
      const node = nodeRef.current;
      if (!node) return () => {};
      node.onInteractionStateChange = () => cb();
      return () => {
        node.onInteractionStateChange = undefined;
      };
    },
    () => nodeRef.current?.interactionState ?? IDLE_STATE,
  );
}
```

### 14.6 ui 层：Pressable 组件 + 样式解析函数

**方案 A：Pressable 组件**（参考 RN `Pressable`）

```tsx
// @react-canvas/ui
<Pressable
  style={(state) => ({
    backgroundColor: state.pressed ? "#ddd" : state.hovered ? "#eee" : "#fff",
    cursor: state.hovered ? "pointer" : "default",
  })}
  onPress={() => console.log("pressed")}
>
  <Text>Click Me</Text>
</Pressable>
```

实现原理：Pressable 内部使用 `useInteractionState`，将 `state` 传入 `style` 函数，每次 state 变化触发 re-render 并重新计算样式。

**方案 B：styleWithState 声明式配置**（推荐，更声明式）

```tsx
// 在 ViewStyle 上增加伪类样式声明
<View
  style={{
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    cursor: "pointer",
    // 伪类样式——命名沿用 CSS 伪类概念
    _hover: { backgroundColor: "#f5f5f5" },
    _active: { backgroundColor: "#e0e0e0" },
    _disabled: { opacity: 0.5, cursor: "default" },
  }}
  disabled={isDisabled}
/>
```

实现原理：react 包的 `commitUpdate` 检测到 `_hover` / `_active` 等字段时，内部注册 `onInteractionStateChange`，在回调中执行样式合并并调用 `node.updateStyle()`。**不需要组件 re-render**——在 commit 层直接操作 core 节点，性能最优。

**合并优先级**：`base < _hover < _active < _disabled`，与 CSS 特异性一致。

### 14.7 Button 组件变得多简洁

```tsx
// 使用方案 B 后的 Button 实现
export function Button({ children, disabled, variant, onPress }) {
  const theme = useTheme();
  const styles = getButtonStyles(theme, variant, disabled);
  return (
    <View
      style={{
        ...styles.base,
        cursor: disabled ? "default" : "pointer",
        _hover: disabled ? undefined : styles.hover,
        _active: disabled ? undefined : styles.active,
        _disabled: disabled ? styles.disabled : undefined,
      }}
      onClick={disabled ? undefined : onPress}
    >
      {children}
    </View>
  );
}
// 不再需要 useState、onPointerEnter/Leave 等样板代码
```

---

## 15. 光标管理

### 15.1 问题

当前光标由 `resolveCursorFromHitLeaf` 沿节点链向上查找第一个有 `cursor` 值的祖先，直接写入 `canvas.style.cursor`。问题：

1. **插件冲突**：viewport 插件在拖拽时需要 `cursor: grabbing`，但 UI 组件的 hover 同时将 cursor 设为 `pointer`——最后写入者胜出，光标闪烁
2. **无法临时覆盖**：系统级操作（resize 手柄、框选）需要锁定光标不被组件覆盖
3. **全局 loading**：异步操作期间想显示 `wait`，无处可设

### 15.2 设计：优先级栈式 CursorManager

```ts
export type CursorPriority = 'node' | 'plugin' | 'system';

// 优先级从低到高：node < plugin < system
const PRIORITY_ORDER: CursorPriority[] = ['node', 'plugin', 'system'];

export class CursorManager {
  constructor(private stage: Stage);

  /**
   * 设置指定优先级的光标。
   * 返回释放函数——调用后移除该设置。
   */
  set(cursor: string, priority: CursorPriority): () => void;

  /**
   * EventDispatcher 内部调用：根据当前 hover 节点更新 node 级光标。
   * 每次 pointermove 自动调用，外部无需手动使用。
   */
  setFromNode(cursor: string): void;

  /** 最终解析：最高优先级的非空值胜出 */
  resolve(): string;
}
```

### 15.3 每个优先级的使用者

| 优先级   | 使用者                                     | 场景                       |
| -------- | ------------------------------------------ | -------------------------- |
| `node`   | EventDispatcher（自动，从 hover 链解析）   | `cursor: 'pointer'` on UI  |
| `plugin` | plugin-viewport 等插件                     | `grab` / `grabbing` 拖拽中 |
| `system` | 应用层 / overlay 操作（框选、resize 手柄） | `crosshair` / `ew-resize`  |

### 15.4 resolve 逻辑

```ts
resolve(): string {
  // system > plugin > node，每个优先级可以有多个 set（栈），取最后一个
  for (let i = PRIORITY_ORDER.length - 1; i >= 0; i--) {
    const stack = this.stacks[PRIORITY_ORDER[i]!];
    if (stack.length > 0) return stack[stack.length - 1]!;
  }
  return 'default';
}
```

### 15.5 EventDispatcher 集成

```ts
// EventDispatcher.onPointerMove 内部
const hitLeaf = hitTest(layer.root, x, y, canvasKit);
const cursor = resolveCursorFromChain(hitLeaf); // 现有链式解析
this.stage.cursorManager.setFromNode(cursor); // 写入 node 级

// 每帧结束：
canvas.style.cursor = this.stage.cursorManager.resolve();
```

### 15.6 viewport 插件用法

```ts
// plugin-viewport 内部
function onPanStart() {
  releaseCursor = stage.cursorManager.set("grabbing", "plugin");
}
function onPanEnd() {
  releaseCursor(); // 恢复 node 级光标
}
```

### 15.7 与伪类系统配合

伪类系统的 `_hover: { cursor: 'pointer' }` 会在 hover 时更新 `node.props.cursor`，EventDispatcher 读取后写入 `cursorManager.setFromNode()`。插件层或系统层的覆盖不受影响（优先级更高）。

---

## 16. Overflow 与 BorderRadius 实现

### 16.1 CSS 对应关系

Canvas 没有 CSS 盒模型，但我们通过 Yoga + Skia 精确还原 CSS 的 `overflow` 和 `borderRadius` 行为。

| CSS                                  | Canvas 实现                                  |
| ------------------------------------ | -------------------------------------------- |
| `overflow: visible`（默认）          | 不裁剪，子节点可超出父节点边界绘制和命中     |
| `overflow: hidden`                   | Skia `clipRect` / `clipRRect` 裁剪绘制和命中 |
| `overflow: scroll`                   | `clipRect` + `translate(-scrollX, -scrollY)` |
| `border-radius: 8px`                 | Skia `RRectXY` 圆角矩形                      |
| `border-radius` + `overflow: hidden` | `clipRRect` 使子内容也被圆角裁剪             |
| 各角独立 `border-radius`（未来扩展） | Skia `MakeRRect` 四角独立半径                |

### 16.2 ViewStyle 中的声明

```ts
export type ViewStyle = {
  // ... 其他属性 ...

  overflow?: "visible" | "hidden"; // ScrollViewNode 内部强制 'hidden'
  borderRadius?: number;

  // 阶段扩展：四角独立
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
};
```

### 16.3 渲染管线中的裁剪

裁剪发生在 `paintNode` 的固定位置：

```
paintNode(node):
  skCanvas.save()

  // 1. 定位
  concat(translate(layout.left, layout.top) * localTransform)

  // 2. 绘制自身背景和边框（背景本身用 RRect 绘制圆角，不需要 clip）
  if backgroundColor:
    if borderRadius > 0:
      drawRRect(canvasKit.RRectXY(rect, r, r), fillPaint)  // 圆角背景
    else:
      drawRect(rect, fillPaint)

  if borderWidth > 0:
    drawRRect(borderRRect, strokePaint)  // 圆角边框

  // 3. 裁剪子内容（仅 overflow:hidden 或 ScrollView）
  if overflow === 'hidden' || node is ScrollViewNode:
    if borderRadius > 0:
      skCanvas.clipRRect(canvasKit.RRectXY(rect, r, r), ClipOp.Intersect, true)
    else:
      skCanvas.clipRect(rect, ClipOp.Intersect, true)
    // ↑ 第三个参数 = anti-alias，确保圆角裁剪边缘平滑

  // 4. ScrollView 额外：平移子内容
  if node is ScrollViewNode:
    skCanvas.translate(-scrollX, -scrollY)

  // 5. 递归绘制子节点
  for child of sortedChildren:
    paintNode(child, ...)

  skCanvas.restore()  // 自动恢复 clip 状态
```

### 16.4 命中测试中的匹配

裁剪不仅影响绘制，还影响事件命中：

```ts
function hitTest(node: ViewNode, x: number, y: number): ViewNode | null {
  // 坐标转换到节点局部空间
  const localX = x - node.layout.left;
  const localY = y - node.layout.top;

  // overflow:hidden 时，超出边界的子节点不可命中
  if (node.props.overflow === "hidden" || node instanceof ScrollViewNode) {
    if (!isInsideBounds(localX, localY, node.layout.width, node.layout.height)) {
      return null; // 点击在裁剪区域外，整棵子树不可命中
    }
    // borderRadius 也参与命中判断
    if (node.props.borderRadius > 0) {
      if (!isInsideRRect(localX, localY, w, h, borderRadius)) {
        return null;
      }
    }
  }

  // 反向遍历子节点（高 z 优先）
  for (let i = children.length - 1; i >= 0; i--) {
    const hit = hitTest(children[i], adjustedX, adjustedY);
    if (hit) return hit;
  }

  // 自身命中（如有背景色或事件处理器）
  if (isInteractive(node) && isInsideBounds(localX, localY, w, h)) {
    return node;
  }
  return null;
}
```

### 16.5 borderRadius 钳位

圆角半径不能超过盒子尺寸的一半，否则 Skia 绘制异常：

```ts
const clampedR = Math.min(borderRadius, width / 2, height / 2);
```

### 16.6 Image 的特殊处理

`ImageNode` 即使没有 `overflow: hidden`，当指定了 `borderRadius` 时也需要裁剪图片到圆角：

```ts
// paintImageNode 内部
if (borderRadius > 0) {
  skCanvas.save();
  skCanvas.clipRRect(rrect, ClipOp.Intersect, true);
  skCanvas.drawImageRect(skImage, srcRect, dstRect, paint);
  skCanvas.restore();
} else {
  skCanvas.drawImageRect(skImage, srcRect, dstRect, paint);
}
```

这让 `<Image style={{ borderRadius: 50, width: 100, height: 100 }} />` 直接产生圆形头像效果。

---

## 17. 嵌套滚动

### 17.1 问题场景

```tsx
<ScrollView style={{ height: 600 }}>
  {" "}
  {/* 外层垂直滚动 */}
  <View style={{ height: 200 }} />
  <ScrollView style={{ height: 300 }}>
    {" "}
    {/* 内层垂直滚动 */}
    <View style={{ height: 1000 }} />
  </ScrollView>
  <View style={{ height: 200 }} />
</ScrollView>
```

当用户在内层滚动到底后继续滚轮，应该 **传递给外层**（scroll chaining）。这是浏览器的默认行为，必须实现。

### 17.2 滚轮事件分发流程

```
wheel 事件（deltaY = -120）
  │
  ├── hitTest 找到最深命中节点
  │
  ├── 沿父链向上找最近的 ScrollViewNode（记为 innerSV）
  │
  ├── 尝试消费：innerSV.scrollY += deltaY
  │   ├── 如果 scrollY 在 [0, maxScroll] 范围内变化 → 消费成功，break
  │   ├── 如果已到达边界（scrollY <= 0 或 scrollY >= maxScroll）
  │   │   └── 未消费的 delta 计算 = remaining
  │   │
  │   └── 继续向上找下一个 ScrollViewNode 祖先（记为 outerSV）
  │       └── outerSV.scrollY += remaining
  │           └── 重复直到消费完毕或到达根
  │
  └── stage.requestPaint()
```

### 17.3 核心算法：consumeScroll

```ts
/**
 * 尝试消费滚动增量。返回未消费的剩余值。
 */
function consumeScroll(
  sv: ScrollViewNode,
  deltaX: number,
  deltaY: number,
): { remainX: number; remainY: number } {
  const maxScrollY = sv.contentHeight - sv.viewportHeight;
  const maxScrollX = sv.contentWidth - sv.viewportWidth;

  // 垂直
  const prevY = sv.scrollY;
  sv.scrollY = clamp(sv.scrollY + deltaY, 0, Math.max(0, maxScrollY));
  const consumedY = sv.scrollY - prevY;

  // 水平
  const prevX = sv.scrollX;
  sv.scrollX = clamp(sv.scrollX + deltaX, 0, Math.max(0, maxScrollX));
  const consumedX = sv.scrollX - prevX;

  return {
    remainX: deltaX - consumedX,
    remainY: deltaY - consumedY,
  };
}
```

### 17.4 EventDispatcher 中的滚动分发

```ts
// EventDispatcher.handleWheel
handleWheel(e: WheelEvent) {
  const { deltaX, deltaY } = e;
  const hitNode = hitTest(...);
  let remain = { remainX: deltaX, remainY: deltaY };

  // 从命中节点向上遍历所有 ScrollViewNode 祖先
  let current: ViewNode | null = findNearestScrollView(hitNode);
  while (current && (remain.remainX !== 0 || remain.remainY !== 0)) {
    if (current instanceof ScrollViewNode) {
      remain = consumeScroll(current, remain.remainX, remain.remainY);
    }
    current = findNearestScrollView(current.parent);
  }

  stage.requestPaint();
}
```

### 17.5 overscrollBehavior 控制

某些场景下内层 ScrollView 到达边界后 **不应** 传递给外层（如侧边栏滚动不应触发页面滚动）。参考 CSS `overscroll-behavior`：

```ts
export type ScrollViewProps = {
  // ... 其他属性 ...

  /**
   * 'auto'：默认，到达边界后传递给父 ScrollView
   * 'contain'：到达边界后停止，不传递
   * 'none'：同 contain + 禁止浏览器原生 overscroll 效果
   */
  overscrollBehavior?: "auto" | "contain" | "none";
};
```

当 `overscrollBehavior === 'contain'`：

```ts
// consumeScroll 返回后
if (sv.props.overscrollBehavior === "contain") {
  break; // 立即停止链式传播
}
```

### 17.6 水平 + 垂直混合

```tsx
<ScrollView horizontal style={{ width: 600 }}>
  {" "}
  {/* 外层水平 */}
  <ScrollView style={{ height: 400, width: 300 }}>
    {" "}
    {/* 内层垂直 */}
    ...
  </ScrollView>
</ScrollView>
```

`consumeScroll` 同时处理 X 和 Y 轴。水平 ScrollView 只消费 deltaX，垂直 ScrollView 只消费 deltaY，**正交方向自然穿透**——内层垂直滚动的 deltaX 不被消费，自动传递给外层水平 ScrollView。

### 17.7 触摸/拖拽滚动

指针拖拽滚动使用 PointerCapture 锁定到被拖拽的 ScrollView，不参与链式传递——因为拖拽意图在 pointerdown 时就锁定了目标。

```
pointerdown on ScrollView 内容区:
  → stage.setPointerCapture(scrollView, pointerId)
  → 拖拽开始

pointermove:
  → 计算 delta，只更新被 capture 的 ScrollView
  → 不传递给父 ScrollView

pointerup:
  → stage.releasePointerCapture(scrollView, pointerId)
```

### 17.8 ScrollViewNode 扩展

```ts
export class ScrollViewNode extends ViewNode {
  scrollX = 0;
  scrollY = 0;
  scrollbarHoverVisible = false;

  /** 是否允许水平滚动，默认 false */
  horizontal = false;

  /** 到达滚动边界时的行为 */
  overscrollBehavior: "auto" | "contain" | "none" = "auto";

  /** 布局后计算的内容尺寸 */
  get contentWidth(): number;
  get contentHeight(): number;

  /** 布局后计算的视口尺寸 */
  get viewportWidth(): number;
  get viewportHeight(): number;

  /** 约束在合法范围内 */
  clampScrollOffsetsAfterLayout(): void;
}
```

---

## 18. 插件系统

### 18.1 现状与问题

当前插件模式：各插件独立暴露 `attachXxxHandlers(canvas, options): () => void` 函数。问题：

1. **只能访问 DOM canvas**：插件拿不到 Stage / 节点树 / 布局信息
2. **无法参与帧周期**：插件想在每帧做自定义绘制（如 inspector 高亮框）需要 hack
3. **生命周期分散**：每个插件单独 attach/detach，Stage 销毁时没有统一清理
4. **插件间通讯困难**：viewport 插件改变 camera 后，inspector 插件需要知道新的 camera 矩阵

### 18.2 设计原则

- **Stage 是插件宿主**：插件注册到 Stage，随 Stage 生命周期管理
- **插件是对象不是函数**：有生命周期钩子的接口，不仅仅是事件挂载
- **插件可以访问 core 全部能力**：Stage / Layer / 节点树 / 事件 / 帧调度
- **插件可以声明依赖和暴露服务**：viewport 暴露 camera 状态，其他插件可消费

### 18.3 PluginContext —— 插件看到的世界

```ts
export type PluginContext = {
  readonly stage: Stage;
  readonly runtime: Runtime;
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;

  // 事件钩子（低级：在 EventDispatcher 流程中插入）
  onBeforeHitTest: HookSlot<BeforeHitTestEvent>; // 拦截/修改命中测试
  onAfterDispatch: HookSlot<AfterDispatchEvent>; // 事件分发后

  // 帧钩子
  onBeforePaint: HookSlot<BeforePaintEvent>; // 布局完成、绘制前
  onAfterPaint: HookSlot<AfterPaintEvent>; // 绘制完成后（叠加绘制）

  // DOM 事件（透传，插件直接监听 canvas DOM 事件）
  addDOMListener<K extends keyof HTMLElementEventMap>(
    type: K,
    listener: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): () => void; // 返回 cleanup

  // 光标
  readonly cursorManager: CursorManager;

  // 注册服务（供其他插件消费）
  provide<T>(key: symbol, value: T): void;
  consume<T>(key: symbol): T | undefined;
};

// Hook 槽位类型
export type HookSlot<E> = {
  tap(fn: (event: E) => void): () => void;
};
```

### 18.4 Plugin 接口

```ts
export type Plugin = {
  readonly name: string;

  /** 插件被注册到 Stage 时调用 */
  attach(ctx: PluginContext): void;

  /** Stage 销毁或插件被移除时调用 */
  detach(): void;

  /** 可选：声明该插件需要在某些插件之后初始化 */
  readonly after?: string[];
};
```

### 18.5 Stage 上的注册 API

```ts
export class Stage {
  // ... 现有 API ...

  /** 注册插件 */
  use(plugin: Plugin): this;

  /** 移除插件 */
  removePlugin(name: string): void;

  /** 获取插件实例 */
  getPlugin<T extends Plugin>(name: string): T | undefined;
}
```

调用时机：`stage.use(plugin)` 立即调用 `plugin.attach(ctx)`。Stage 销毁时按注册逆序调用所有插件的 `detach()`。

### 18.6 典型插件实现

**viewport 插件**：

```ts
import type { Plugin, PluginContext } from "@react-canvas/core";

export const VIEWPORT_KEY = Symbol("viewport");

export type ViewportState = {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
};

export function createViewportPlugin(options?: ViewportOptions): Plugin {
  let ctx: PluginContext;
  let state: ViewportState = { offsetX: 0, offsetY: 0, scale: 1 };
  let cleanups: (() => void)[] = [];

  return {
    name: "viewport",

    attach(c) {
      ctx = c;

      // 注册服务，其他插件可消费 camera 状态
      ctx.provide(VIEWPORT_KEY, {
        getState: () => state,
        subscribe: (fn: () => void) => {
          /* ... */
        },
      });

      // 监听 DOM 事件
      cleanups.push(
        ctx.addDOMListener(
          "wheel",
          (e) => {
            if (e.metaKey || e.ctrlKey) {
              e.preventDefault();
              // 缩放逻辑
              state = { ...state, scale: state.scale * (1 - e.deltaY * 0.001) };
              ctx.stage.setCamera({ ...state });
              ctx.stage.requestPaint();
            }
          },
          { passive: false },
        ),
      );

      // 拖拽平移时锁定光标
      cleanups.push(
        ctx.addDOMListener("pointerdown", (e) => {
          if (shouldPan(e)) {
            const release = ctx.cursorManager.set("grabbing", "plugin");
            // ... setup pan tracking ...
            cleanups.push(release);
          }
        }),
      );
    },

    detach() {
      for (const fn of cleanups) fn();
      cleanups = [];
    },
  };
}
```

**inspector 插件**（帧钩子 + 叠加绘制）：

```ts
export function createInspectorPlugin(): Plugin {
  let ctx: PluginContext;
  let hoveredNode: ViewNode | null = null;
  let cleanups: (() => void)[] = [];

  return {
    name: "inspector",
    after: ["viewport"], // 确保在 viewport 之后初始化

    attach(c) {
      ctx = c;

      // 在每帧绘制后叠加高亮框
      cleanups.push(
        ctx.onAfterPaint.tap(({ skCanvas, canvasKit }) => {
          if (!hoveredNode) return;
          const rect = ctx.stage.getNodeWorldRect(hoveredNode);
          drawHighlightOverlay(skCanvas, canvasKit, rect);
        }),
      );

      // 消费 viewport 的 camera 状态
      const viewportService = ctx.consume(VIEWPORT_KEY);
      // ... 用于坐标转换 ...
    },

    detach() {
      for (const fn of cleanups) fn();
    },
  };
}
```

**keyboard 插件**：

```ts
export function createKeyboardPlugin(): Plugin {
  let ctx: PluginContext;
  const pressedKeys = new Set<string>();
  let cleanups: (() => void)[] = [];

  return {
    name: "keyboard",

    attach(c) {
      ctx = c;

      // 键盘事件需要监听 document（canvas 不可聚焦时）
      const onKeyDown = (e: KeyboardEvent) => {
        pressedKeys.add(e.key);
        // 可以和 FocusManager 联动：将键盘事件分发给 focused 节点
        const focused = ctx.stage.focusManager?.focusedNode;
        focused?.interactionHandlers?.onKeyDown?.(e);
      };
      const onKeyUp = (e: KeyboardEvent) => {
        pressedKeys.delete(e.key);
      };
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("keyup", onKeyUp);
      cleanups.push(() => {
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
      });
    },

    detach() {
      for (const fn of cleanups) fn();
    },
  };
}
```

### 18.7 react 包中使用插件

```tsx
// plugin-viewport 暴露 react hook
export function useViewport(options?: ViewportOptions) {
  const stage = useStage(); // 从 Context 获取

  useEffect(() => {
    const plugin = createViewportPlugin(options);
    stage.use(plugin);
    return () => stage.removePlugin("viewport");
  }, [stage]);
}

// 用户代码
function App() {
  return (
    <CanvasProvider>
      {({ isReady }) =>
        isReady && (
          <Canvas width={800} height={600} plugins={[viewportPlugin, inspectorPlugin]}>
            <View>...</View>
          </Canvas>
        )
      }
    </CanvasProvider>
  );
}
```

### 18.8 帧钩子在渲染管线中的位置

```
FrameScheduler.tick()
  │
  ├─ Layout 阶段
  │
  ├─ 🔌 onBeforePaint.call()  — 插件可以在此修改节点/camera
  │
  ├─ Paint 阶段（所有 Layer）
  │
  ├─ 🔌 onAfterPaint.call()   — 插件可以在此叠加绘制（高亮、辅助线等）
  │
  └─ surface.flush()
```

### 18.9 与现有 attach 模式的迁移

现有 `attachViewportHandlers` 等函数可以封装为 Plugin 对象的 `attach` 实现，对外暴露新的 `createXxxPlugin()` 工厂函数。旧的 attach 函数作为内部实现保留，不破坏渐进迁移。

| 模块                            | 现状                         | 工作                                       |
| ------------------------------- | ---------------------------- | ------------------------------------------ |
| Runtime 初始化                  | ✅ 完善                      | 接口 rename，影响面小                      |
| **Stage 类**                    | ❌ 不存在（分散在 react 包） | 新建，最大工作量                           |
| **Layer 系统**                  | ❌ 不存在                    | 新建                                       |
| ViewNode / TextNode             | ✅ 基本完善                  | 补 `dirtyLevel`、`markDirty`               |
| ImageNode / ScrollViewNode      | ✅ 基本完善                  | `requestRedrawFromImage` 改为 Stage 级     |
| CustomNode                      | ❌ 不存在                    | 新建，简单                                 |
| SceneNode union                 | ⚠️ 不完整                    | 补上所有子类型                             |
| **两级 dirty tracking**         | ❌ 未使用                    | 新增，与 FrameScheduler 联动               |
| 渲染管线                        | ✅ 基本完善                  | 接入 Layer / shadow / gradient             |
| **事件：捕获阶段**              | ❌ 无                        | 新增                                       |
| **事件：Layer 阻断**            | ❌ 无                        | Stage.EventDispatcher 内实现               |
| **PointerCapture**              | ❌ 无                        | Stage 级实现                               |
| **FrameScheduler per-Stage**    | ⚠️ 全局 WeakMap              | 重构为 Stage 成员                          |
| Ticker                          | ❌ 无                        | 新建，简单                                 |
| 资源销毁                        | ⚠️ 部分                      | `Stage.destroy()` 统一管理                 |
| **InteractionState**            | ❌ 无（ui 层 useState 替代） | ViewNode 新增位标记 + EventDispatcher 维护 |
| **FocusManager**                | ❌ 无                        | Stage 级新建，与 keyboard 插件联动         |
| **伪类样式解析**                | ❌ 无                        | react 包 commitUpdate 层实现 `_hover` 等   |
| **CursorManager**               | ⚠️ 简单链式解析              | 重构为优先级栈，Stage 成员                 |
| **嵌套滚动 scroll chaining**    | ❌ 无                        | EventDispatcher 内 consumeScroll 链        |
| **overscrollBehavior**          | ❌ 无                        | ScrollViewNode 属性 + 分发逻辑             |
| **Plugin 接口**                 | ⚠️ attach 函数，无统一接口   | Plugin 接口 + PluginContext + Stage.use    |
| **帧钩子（before/afterPaint）** | ❌ 无                        | FrameScheduler 调用链中插入                |
