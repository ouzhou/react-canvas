# React Canvas 开发阶段规划

> 基于 [技术调研报告](./core/technical-research.md) 的结论，结合项目当前进度，制定分阶段开发计划。

**说明：** 阶段一～三及阶段四的 **Image / SvgPath** 已落地；**`@react-canvas/ui`**（主题、画布侧组件如 `Button` 等）在演进中，专项设计见 [react-canvas-ui-phase-1-design.md](./superpowers/specs/2026-04-05-react-canvas-ui-phase-1-design.md)。**滚动 / overflow 裁剪（阶段四 Step 9）**、动画、无障碍等仍多为待实现。

---

## 阶段进度

> 按 **路线图阶段（一～六）** 与 **Step 编号** 汇总整体完成度；与下文 **[当前进度](#当前进度)**（按能力模块拆解）互为补充。  
> **`@react-canvas/ui`** 为主题与复合组件库，**不绑定单一阶段编号**，与阶段六「完善与打磨」并行演进。

| 阶段             | 规划 Step | 状态            | 说明                                                                                            |
| ---------------- | --------- | --------------- | ----------------------------------------------------------------------------------------------- |
| 一、核心渲染管线 | 1–3       | ✅ **已完成**   | Yoga、CanvasKit、Reconciler、`Canvas` / `CanvasProvider`、帧调度等                              |
| 二、文字能力     | 4–5       | ✅ **已完成**   | `Text`、Paragraph 测量/绘制、嵌套 Text、换行、`numberOfLines` 等                                |
| 三、交互能力     | 6         | ✅ **已完成**   | 指针、`hitTest`、`onPointer*` / `onClick`、合成 `pointerenter`/`leave` 等                       |
| 四、多媒体与滚动 | 8–9       | 🔶 **部分完成** | **Step 8** `Image` / `SvgPath` 已交付；**Step 9** `overflow` 裁剪、ScrollView **未开始**        |
| 五、高级绘制能力 | 10        | ❌ **未开始**   | 阴影、渐变、`clipPath`、`transform`、自定义字体等                                               |
| 六、完善与打磨   | 11–16     | ❌ **未开始**   | StyleSheet、动画、无障碍、FlatList、DevTools、文档与 Playground 等；**Step 16** Tailwind 为可选 |

---

## 当前进度

> 按 **模块/能力** 列状态；**阶段与 Step 粒度**见上节 [阶段进度](#阶段进度)。

| 模块                  | 状态          | 说明                                                                                    |
| --------------------- | ------------- | --------------------------------------------------------------------------------------- |
| monorepo 结构         | ✅ 完成       | `packages/core` + `packages/react` + `packages/ui` + `apps/website`                     |
| `ViewNode` 场景树     | ✅ 阶段一基线 | `packages/core`：树操作、样式拆分、布局回写、基础绘制                                   |
| Reconciler HostConfig | ✅ 持续演进   | `packages/react`：`View` / `Text` / `Image` / `SvgPath` 等宿主、`commitUpdate`、场景根  |
| 绘制管线              | ✅ 阶段一基线 | `paintScene` / `paintNode`；站内在线 demo 见 playground 等页                            |
| Yoga 布局             | ✅ 阶段一基线 | `yoga-layout`（WASM async，版本见根目录 `pnpm-workspace.yaml` catalog）                 |
| CanvasKit (Skia)      | ✅ 阶段一基线 | 直接使用 Skia WASM（`canvaskit-wasm`，catalog 锁定版本），不经 Canvas 2D                |
| Text 节点             | ✅ 阶段二基线 | `TextNode`、Paragraph 测量/绘制、嵌套 `Text`、`numberOfLines` / `ellipsizeMode` 等      |
| 事件系统              | ✅ 阶段三基线 | DOM `pointer*`、`hitTest`（含 `Text` 整框）、**冒泡**分发、合成 `onClick`、hover 辅助等 |
| Image 组件            | ✅ 阶段四基线 | 异步解码、`resizeMode`、`SkImage` 缓存、`onLoad` / `onError`                            |
| SvgPath 组件          | ✅ 阶段四基线 | `d` + `viewBox` 等比绘制、stroke/fill（见阶段四专项规格）                               |
| `@react-canvas/ui`    | 🔶 演进中     | 主题 Token、`Button`、样式合并辅助等；依赖 `core` / `react`                             |
| 滚动 / 裁剪           | ❌ 未开始     | `overflow: hidden`、ScrollView、惯性滚动等（阶段四 Step 9）                             |
| 动画系统              | ❌ 未开始     |                                                                                         |
| 无障碍                | ❌ 未开始     |                                                                                         |
| Tailwind / className  | 🔲 远期可选   | 见阶段六 Step 16，**优先级极低**（收益有限，无法等同 Web）                              |
| 运行时结构校验        | 🔶 持续扩展   | R-ROOT-1、R-HOST-1～5（`Text` 相关）等已随实现强制；Portal 等仍按专文约定               |

---

## 结构约束（须运行时强制）

> 下列规则 **必须通过代码在运行时生效**（抛错、invariant 或等价失败），**不能**仅靠文档或 TypeScript 类型「提醒」。此处记录 **规则 ID** 与 **建议落地阶段**；**检测点、抛错策略与测试建议** 见专文 [runtime-structure-constraints.md](./react/runtime-structure-constraints.md)。

### 根与加载上下文

| 规则 ID  | 规则                                                                                                                                                                                                                                     | 建议落地                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| R-ROOT-1 | 使用 `<Canvas>` 时须处于 **`CanvasProvider` 已提供且 Yoga/CanvasKit 已就绪** 的 Context 中；否则 **必须失败**（抛错），而非静默无绘制或 undefined 行为。                                                                                 | 阶段一 Step 3               |
| R-ROOT-2 | 宿主类型（阶段一为 `View`，后续含 `Text` / `Image` 等）**只能**出现在 **该 `<Canvas>` 所绑定 Reconciler 根** 的子树中；若对外误导出可在 DOM 树误用的 API，须在 **开发模式** 下可检测时 **assert / 抛错**（具体手段随 public API 定型）。 | 阶段一 Step 3 起随 API 收口 |

### 宿主树合法性（对齐 React Native 组件模型）

| 规则 ID  | 规则                                                                                                                                                | 建议落地                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| R-HOST-1 | **`View` 下允许 `Text`**。                                                                                                                          | 阶段二（已随 `Text` 落地） |
| R-HOST-2 | **`Text` 内禁止 `View`**（及任何非文字意图的块级宿主；具体名单随宿主类型扩展而更新）。违反时 **必须抛错**，错误信息应指明「Text 内不可嵌套 View」。 | 阶段二（已实现）           |
| R-HOST-3 | **`Text` 内允许嵌套 `Text`** 与文本叶子（与 RN 一致）。                                                                                             | 阶段二（已实现）           |
| R-HOST-4 | **`View` 下禁止裸字符串 / 裸文本节点**（未由 `<Text>` 包裹）；在 `createTextInstance` 或首次挂子节点路径 **必须抛错**。                             | 阶段二（已实现）           |
| R-HOST-5 | 阶段一仅 `View` 时：**禁止**出现需 `createTextInstance` 的路径（当前设计为对裸文本 **抛错**），与上条一致。                                         | 阶段一 Step 3              |

### 多 Canvas 与 Portal（先约束、后实现）

| 规则 ID    | 规则                                                                                                                                                                                                                              | 建议落地                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| R-MULTI-1  | **多个并列 `<Canvas>`**（同级或多个 Provider 子树）是否允许：V1 **允许**并列多个独立 Surface；**禁止**在单棵场景树内出现「宿主节点再嵌一个 Canvas 根」的歧义结构（阶段一无可挂点，后续若增加宿主型 `Canvas` 须重新定义本条）。    | 随阶段一/四能力演进复查                                     |
| R-PORTAL-1 | **`ReactDOM.createPortal` / `react-reconciler` Portal** 在未实现 HostConfig Portal 与多容器规格前，遇 **跨根传送** 须 **明确失败**（抛错或 dev 下 invariant），**禁止**静默错误渲染。实现 Portal 后本条替换为「按专页规格校验」。 | 未实现前：阶段一起可防御性检测；完整 Portal：**另立里程碑** |

### 实现备忘

- 完整检测设计见 [runtime-structure-constraints.md](./react/runtime-structure-constraints.md)。
- **推荐机制**：`getChildHostContext` 传递「是否在 `Text` 内」等标志；`createInstance` / `createTextInstance` / `appendChild` 路径上校验并抛错。
- 与 [hostconfig-guide.md](./react/hostconfig-guide.md) 一致：**校验发生在 commit 路径**，不在 render 函数体里改场景树。

---

## 阶段总览

```
阶段一  核心渲染管线        ← 地基，所有后续功能的前提（直接使用 CanvasKit/Skia）
阶段二  文字能力            ← UI 的基本要素（使用 Skia Paragraph API）
阶段三  交互能力            ← 从"能看"到"能用"
阶段四  多媒体与滚动        ← 完整 UI 场景
阶段五  高级绘制能力        ← 阴影、渐变、clipPath、transform 等
阶段六  完善与打磨          ← 生产可用（含可选：Tailwind → style，极低优先级）
```

---

## 阶段一：核心渲染管线

> 目标：嵌套的 `<View style={...} />` 能在 Canvas 上按照 Flexbox 规则正确布局，并通过 CanvasKit (Skia WASM) 绘制。
>
> 详细设计规格见 [phase-1-design.md](./react/phase-1-design.md)。

### Step 1 — Yoga 集成 + CanvasKit 初始化

**包：** `@react-canvas/core`

| 任务                    | 详情                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 安装 yoga-layout        | `yoga-layout`（官方 WASM 包，使用 `yoga-layout/load` 异步加载）                                                        |
| 安装 canvaskit-wasm     | `canvaskit-wasm`（Skia 官方 WASM 包 v0.41.0）                                                                          |
| 并行异步初始化          | `Promise.all([initYoga(), CanvasKitInit()])` 并行加载两个 WASM 模块                                                    |
| ViewNode 关联 Yoga Node | 构造时创建 `Yoga.Node`，销毁时 `free()` 释放 WASM 内存                                                                 |
| style → Yoga 属性映射   | `width` / `height` / `flex` / `flexDirection` / `margin` / `padding` / `position` / `alignItems` / `justifyContent` 等 |
| 扩展布局属性            | `gap` / `flexWrap` / `minWidth` / `maxWidth` / `minHeight` / `maxHeight` / `aspectRatio` / `display`                   |
| Yoga 默认值对齐 RN      | `flexDirection: 'column'`、`flexShrink: 0`                                                                             |
| 布局计算                | 根节点调用 `yogaRoot.calculateLayout(width, height)`，结果写回节点的 `layout` 属性                                     |
| 增量布局                | 依赖 Yoga 自身的脏标记机制，只重算变化的子树                                                                           |

### Step 2 — Skia 绘制管线

**包：** `@react-canvas/core`

| 任务                     | 详情                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Surface 创建             | `CanvasKit.MakeCanvasSurface(id)` 优先 WebGL2，降级 `MakeSWCanvasSurface`                           |
| `paintNode` 使用布局坐标 | 读取 `node.layout.left/top/width/height`，通过 Skia API 绘制                                        |
| 坐标系累加               | 子节点坐标相对于父节点，绘制时累加偏移                                                              |
| 视觉样式                 | `backgroundColor`（`drawRect`/`drawRRect`）、`borderRadius`、`borderWidth`/`borderColor`、`opacity` |
| DPR 处理                 | `canvas.width = logicalWidth * dpr`，`skCanvas.scale(dpr, dpr)`                                     |
| DPR 变化监听             | `matchMedia` 监听 DPR 变化，重建 Surface 并重绘                                                     |
| WASM 资源释放            | Paint 每帧 `delete()`，Surface 在 unmount 时 `delete()`，YogaNode 在移除时 `free()`                 |

### Step 3 — Reconciler + 帧调度

**包：** `@react-canvas/react`

| 任务             | 详情                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| HostConfig 实现  | `createInstance` / `commitUpdate` / `prepareUpdate`（diff）/ `resetAfterCommit` 等     |
| `CanvasProvider` | 并行加载 Yoga + CanvasKit，通过 Context 暴露 ready 状态，render prop 供用户控制加载 UI |
| `Canvas` 组件    | 创建 Surface + Reconciler 容器，持有根 ViewNode 与 `queueLayoutPaintFrame`（帧调度）   |
| rAF 帧合并       | `surface.requestAnimationFrame` 去重，同帧内多次 commit 只绘制一次                     |
| 脏标记           | `ViewNode` 增加 `dirty` 标志，`commitUpdate` 时标记                                    |
| 差量更新         | `prepareUpdate` 计算 style diff，无变化返回 `null` 跳过 commit                         |
| 运行时结构校验   | **R-ROOT-1**、**R-HOST-5**：见上文 **结构约束（须运行时强制）**（抛错，非仅文档）      |

**验收标准：**

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
// → 两个 100×100 的矩形，红色在左蓝色在右，通过 CanvasKit 绘制
```

- 嵌套 View 在正确位置绘制
- Flexbox 布局结果与 React Native 一致
- `borderRadius` 圆角正常显示
- 高分屏（Retina）上不模糊
- 连续多次 `setState` 只触发 1 次绘制

---

## 阶段二：文字能力

> 目标：`<Text>Hello World</Text>` 能正确显示文字，支持换行和基本样式。  
> **当前实现状态：** Step 4–5 能力已在仓库中落地（含嵌套 `Text`、换行、`numberOfLines` / 省略号、行高与样式合并等；以 Skia Paragraph 能力与 `packages/core` 实现为准）。

### Step 4 — Text 节点基础

**包：** `@react-canvas/core` + `@react-canvas/react`

| 任务                  | 详情                                                                          |
| --------------------- | ----------------------------------------------------------------------------- |
| `TextNode` 类型       | 新增节点类型，区别于 `ViewNode`                                               |
| Reconciler 扩展       | `createInstance` 支持 `"Text"` 类型；`createTextInstance` 创建文本叶子节点    |
| `getChildHostContext` | 传递「是否在 Text 内」等上下文；**R-HOST-2～4** 须运行时抛错，见 **结构约束** |
| Yoga measure 回调     | `yogaNode.setMeasureFunc()`，用 Skia Paragraph API 返回文字宽高给 Yoga        |
| 绘制                  | `skCanvas.drawParagraph()` 在 Yoga 计算出的坐标绘制文字                       |
| 基础文字样式          | `fontSize`、`color`、`fontFamily`、`fontWeight`、`textAlign`                  |

**验收标准：**

```tsx
<View style={{ width: 200, padding: 10 }}>
  <Text style={{ fontSize: 16, color: "black" }}>Hello World</Text>
</View>
// → 文字在 View 内正确定位，Yoga 根据文字宽度计算布局
```

### Step 5 — 文字换行与富文本

**包：** `@react-canvas/core`

| 任务               | 详情                                                                |
| ------------------ | ------------------------------------------------------------------- |
| 逐词换行           | 使用 Skia Paragraph API 自动处理换行                                |
| CJK 支持           | CJK 字符间可断行（参考 minigame-canvas-engine 的 `wordBreak` 规则） |
| `numberOfLines`    | 限制最大行数，超出截断                                              |
| 省略号             | `ellipsizeMode: 'tail'` 截断并显示 `...`                            |
| `lineHeight`       | 控制行间距                                                          |
| 嵌套 Text 样式继承 | 内层 `<Text>` 继承外层的 `fontSize` / `color`（参考 RN）            |
| 嵌套 Text 绘制     | 合并为单个段落，内层样式作为 inline span 处理                       |

**验收标准：**

```tsx
<Text style={{ fontSize: 14, color: "#333" }} numberOfLines={2}>
  <Text style={{ fontWeight: "bold" }}>标题</Text>
  这是一段很长的中英文混排文字 with English words，会自动换行，
  超出两行的部分会被截断并显示省略号...
</Text>
```

---

## 阶段三：交互能力

> 目标：用户可以点击 Canvas 上的元素，触发事件回调。  
> **规格书：** [superpowers/specs/2026-04-05-phase-3-interaction-design.md](./superpowers/specs/2026-04-05-phase-3-interaction-design.md)  
> **实现计划：** [superpowers/plans/2026-04-05-phase-3-implementation.md](./superpowers/plans/2026-04-05-phase-3-implementation.md)

**当前实现状态：** Step 6 核心能力（坐标换算、命中、`onPointer*` / `onClick`、hover 相关）已在仓库中落地。事件分发 **当前为冒泡阶段**（见 `dispatchBubble`）；若需与 RN 完全一致的捕获阶段，列为后续迭代。

### 设计说明（v1 简化）

- **对外主 API**：合成 **`onClick`**（习惯对齐 React DOM）；底层仍由 `pointer*` + 命中检测实现。与 RN 文档中的 `onPress` 对应关系在文档中说明即可，**不强制**单独暴露 `onPress`。
- **命中宿主**：**`View` 与 `Text`** 均可参与命中（对齐 RN：可点击文字、链接）；首版 `Text` 命中可用**整段布局包围盒**（glyph 级命中可后议）。
- **hover / 按压**：**不提供 CSS `:hover` 或选择器引擎**；由交互层维护 **`hovered` / `pressed` 等状态**（或 `pointerenter` / `leave` 等价能力），业务侧用 **`style` 对象**切换外观。`:hover` 改 class、Tailwind 工具类见阶段六 Step 16（可选）。

### 网页（Web）场景：按压态与「类 :hover」

- **按压态**：用 **`View` / `Text` + `useState` + `onPointerDown` / `onPointerUp` / `onPointerCancel`**（可再配合 `onClick`）即可。

- **没有 CSS `:hover` / `:active` 伪类。** 画布里的 UI 画在 **单个 `<canvas>`** 上，场景节点不是独立 DOM，浏览器样式表无法对「某个 View」写 `#x:hover`。等价做法是 **状态驱动样式**：用 **`onPointerEnter` / `onPointerLeave`**（在指针移动、命中从 A 变到 B 时由运行时合成，见 `pointer-hover.ts`）更新 React state，再按 `hovered` / `pressed` 拼 **`style` 对象**——效果上接近 Web 的 hover，但语义是 **RN 式 props + 对象样式**，不是选择器。

```tsx
function HoverCard() {
  const [hovered, setHovered] = useState(false);
  return (
    <View
      style={{
        padding: 12,
        backgroundColor: hovered ? "#f0f0f0" : "#fff",
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Text style={{ fontSize: 14 }}>悬停变色</Text>
    </View>
  );
}
```

### Step 6 — 事件系统

**包：** `@react-canvas/core` + `@react-canvas/react`

| 任务         | 详情                                                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DOM 事件监听 | Canvas 元素上监听 `pointerdown` / `pointermove` / `pointerup` / `pointercancel`（`wheel` 可与阶段四 ScrollView 一并收紧语义）                                                          |
| 坐标转换     | DOM 事件坐标 → Canvas 逻辑坐标（考虑 DPR、Canvas 偏移）                                                                                                                                |
| 命中检测     | 基于 Yoga 布局结果的包围盒检测，与绘制顺序一致的兄弟反序；**View、Text** 均可为命中目标                                                                                                |
| 事件传播     | **当前实现：冒泡（叶 → 根）**；捕获阶段可后续对齐 RN                                                                                                                                   |
| 合成事件     | 包装为统一事件对象：`locationX/Y`（相对节点）、`pageX/Y`（相对 Canvas）、`target`、`stopPropagation()`                                                                                 |
| 事件 props   | `View` / `Text`：`onPointerDown` / `onPointerUp` / `onPointerMove`；**`onPointerEnter` / `onPointerLeave`**（用于 hover 态）；**`onClick`**（一次完整激活，含位移/时间阈值等简单判定） |

**验收标准：**

```tsx
<View
  style={{ width: 100, height: 100, backgroundColor: "blue" }}
  onClick={() => console.log("clicked")}
/>
```

---

## 阶段四：多媒体与滚动

> 目标：支持图片与矢量路径绘制，以及可滚动内容区域。  
> **规格书：** [superpowers/specs/2026-04-05-phase-4-image-svgpath-design.md](./superpowers/specs/2026-04-05-phase-4-image-svgpath-design.md)  
> **实现计划：** [superpowers/plans/2026-04-05-phase-4-implementation.md](./superpowers/plans/2026-04-05-phase-4-implementation.md)

**当前实现状态：** Step 8（**Image** + **SvgPath**）已落地；**Step 9（滚动 / `overflow` 裁剪）** 仍为待办。

### Step 8 — Image 与 SvgPath

**包：** `@react-canvas/core` + `@react-canvas/react`

| 任务             | 详情                                                             |
| ---------------- | ---------------------------------------------------------------- |
| `ImageNode` 节点 | Reconciler 支持 `"Image"` 宿主类型                               |
| 异步加载         | fetch → `CanvasKit.MakeImageFromEncoded()` → 标记脏 → 重绘       |
| 绘制             | `skCanvas.drawImageRect()` 在 Yoga 计算的位置绘制                |
| 缓存             | URL → decoded `SkImage` 的 Map，避免重复解码                     |
| 生命周期         | `onLoad` / `onError` 回调                                        |
| 尺寸             | 支持 `resizeMode`（cover / contain / stretch / center 等）       |
| `SvgPathNode`    | `"SvgPath"` 宿主；`d` + `viewBox` → 等比居中；stroke / fill 绘制 |

**验收标准（Image）：**

```tsx
<Image
  source={{ uri: "https://example.com/photo.jpg" }}
  style={{ width: 200, height: 150 }}
  onLoad={() => console.log("loaded")}
/>
```

### Step 9 — overflow 裁剪与 ScrollView

**包：** `@react-canvas/core` + `@react-canvas/react`

| 任务                 | 详情                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| `overflow: 'hidden'` | 绘制前 `skCanvas.save()` → `skCanvas.clipRect/clipRRect()` → 绘制子节点 → `skCanvas.restore()` |
| `ScrollView` 组件    | 监听触摸/滚轮 → 更新偏移量 → clip 区域内偏移绘制                                               |
| 惯性滚动             | 基于 `pointermove` 速度的减速动画                                                              |
| 滚动指示器           | 可选的滚动条绘制                                                                               |
| 弹性回弹             | 滚动到边界时的弹性效果（可选）                                                                 |

**验收标准：**

```tsx
<ScrollView style={{ height: 300 }}>
  {Array.from({ length: 50 }, (_, i) => (
    <Text key={i} style={{ height: 40 }}>
      第 {i + 1} 行
    </Text>
  ))}
</ScrollView>
```

---

## 阶段五：高级绘制能力

> 目标：利用 CanvasKit (Skia) 的高级 API，支持阴影、渐变、裁剪路径、变换等进阶视觉效果。
>
> 注：CanvasKit 已在阶段一集成，本阶段专注于扩展绘制能力。

### Step 10 — 高级视觉效果

**包：** `@react-canvas/core`

| 任务        | 详情                                                            |
| ----------- | --------------------------------------------------------------- |
| 阴影        | `shadow*` 样式属性 → Skia `MaskFilter` / `ImageFilter` 实现     |
| 渐变        | `LinearGradient` / `RadialGradient` 作为 backgroundColor 的扩展 |
| `clipPath`  | 自定义裁剪路径（使用 `PathBuilder`，0.41.0 新 API）             |
| `transform` | `translateX/Y`、`scale`、`rotate` → `skCanvas.concat(matrix)`   |
| 字体加载    | `CanvasKit.Typeface.MakeFreeTypeFaceFromData()` 加载自定义字体  |

**验收标准：**

- 阴影、渐变效果正常显示
- transform 变换可叠加
- 自定义字体加载并正确渲染

---

## 阶段六：完善与打磨

> 目标：对齐 React Native 的开发体验，生产可用。

### Step 11 — StyleSheet 与样式系统

| 任务                       | 详情                                               |
| -------------------------- | -------------------------------------------------- |
| `StyleSheet.create()`      | 样式预处理与 ID 化                                 |
| 样式数组合并               | `style={[styles.base, isActive && styles.active]}` |
| `StyleSheet.flatten()`     | 将数组展平为单个样式对象                           |
| `StyleSheet.hairlineWidth` | 1 物理像素的宽度值                                 |

### Step 12 — 动画系统

| 任务                              | 详情                                           |
| --------------------------------- | ---------------------------------------------- |
| `Animated.Value`                  | 可动画化的值容器                               |
| `Animated.timing` / `spring`      | 定时 / 弹簧动画驱动器                          |
| `Animated.View` / `Animated.Text` | 可动画化的组件包装                             |
| 绕过 Reconciler                   | 动画直接修改场景树节点属性 → 标记脏 → rAF 重绘 |
| 缓动函数                          | `linear` / `easeInOut` / `bounce` / `spring`   |

#### 动画系统子阶段（完备能力拆解）

> **说明：** 下表为 **Step 12 内部**建议实现顺序，**不改变** Step 11～16 编号。`transform` 与 **阶段五 Step 10** 绑定；动画若要动 `transform`，须与 Step 10 **对齐或同批交付**，避免「API 有、画面无」。上次实现需特别注意：**`paintNode` 内坐标系（世界 / 局部）与子树递归须一致**，否则布局会整体错位。

| 子阶段   | 名称             | 交付内容（概要）                                                                                                                                                                                                        | 依赖 / 难度                                                                    |
| -------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **12‑0** | 地基             | **`style.transform` 绘制**（与 Yoga 布局盒一致）；**命中**与 paint 使用同一套变换；可选 **`queuePaintOnlyFrame`**（纯视觉更新不每帧全量 Yoga）                                                                          | 依赖阶段五 **Step 10**（或等价 transform 绘制）；难度 **中**（易在坐标上踩坑） |
| **12‑1** | 最小可动         | `Animated.Value`；**`timing`** + Easing；写回 **`opacity` + `transform` 白名单**；**`Animated.View`**；**绕过 Reconciler** 写场景树、`stopAnimation` / 卸载清理                                                         | 依赖 **12‑0**；难度 **中**                                                     |
| **12‑2** | RN 常用 API      | **`spring`**、**`decay`**、**`loop`**；**`interpolate`**（含 extrapolate）；**`parallel` / `sequence` / `stagger`**；**`ValueXY`**；**`Animated.Text` / `Image` / `SvgPath`**（同一白名单）；开发态非白名单 **warning** | 依赖 **12‑1**；难度 **中**                                                     |
| **12‑3** | 输入驱动         | **`Animated.event`**（指针位移 → Value 等）；**滚动/contentOffset** 映射 **视阶段四 Step 9（ScrollView）** 而定                                                                                                         | 依赖 **12‑2** + 交互/滚动；难度 **高**                                         |
| **12‑4** | 布局动画（可选） | **布局属性**（width/height/margin 等）动画 + Yoga 脏路径 / 性能策略                                                                                                                                                     | 独立大项；难度 **很高**                                                        |
| **12‑5** | 打磨             | 文档、`apps/website` Playground 示例、测试矩阵、性能摸底；可选便捷 hook                                                                                                                                                 | 依赖前置子阶段；难度 **低～中**                                                |

**完备「动画全家桶」与难度档位（对照，非独立步骤）：**

| 难度     | 能力举例                                                                                  |
| -------- | ----------------------------------------------------------------------------------------- |
| **低**   | 帧合并；仅重绘调度；`Animated.Value`；Easing；`loop`（薄封装）                            |
| **中**   | `interpolate`；`timing` / `spring` / `decay`；组合 API；多宿主绑定；命中与 transform 一致 |
| **高**   | `Animated.event`；与 ScrollView/滚动的联动                                                |
| **很高** | 布局属性动画；专用动画 DevTools / 时间线（远期）                                          |

### Step 13 — 无障碍

| 任务         | 详情                                                            |
| ------------ | --------------------------------------------------------------- |
| Proxy DOM 层 | Canvas 上方维护隐藏 DOM 树，携带 ARIA 属性                      |
| 组件 API     | `accessible` / `accessibilityRole` / `accessibilityLabel` props |
| 同步更新     | Reconciler 同时更新场景树和 Proxy DOM                           |
| 焦点关联     | DOM 焦点事件 → Canvas 高亮渲染                                  |

### Step 14 — 虚拟列表 FlatList

| 任务                 | 详情                                                        |
| -------------------- | ----------------------------------------------------------- |
| VirtualizedList 内核 | 只对可视区域执行布局和绘制                                  |
| `FlatList` 组件      | `data` / `renderItem` / `keyExtractor` API                  |
| 性能参数             | `windowSize` / `initialNumToRender` / `maxToRenderPerBatch` |
| 回收复用             | 离开可视区域的节点卸载，释放 Yoga Node                      |

### Step 15 — 开发者工具与文档

| 任务                | 详情                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| React DevTools 支持 | 确保场景树在 React DevTools 中可检查                                  |
| 布局调试模式        | 开发模式下渲染节点边框和布局信息叠加层                                |
| API 文档            | 完善 `apps/website`（Astro Starlight）的组件 API 文档                 |
| Playground          | 在线交互式 demo（可嵌入文档站）                                       |
| 组件库演进          | `packages/ui` 中主题与复合组件（与核心宿主 API 互补，非宿主替代方案） |

### Step 16 — Tailwind / `className` 原子化样式（可选，**极低优先级**）

> **定位：** 在核心 `style` API 稳定之后，再评估是否做；**不纳入 M6 必达范围**。  
> **预期：** 无法复刻浏览器里「写 Tailwind = 写 Web」的体验；仅能覆盖 **映射到 Yoga / Skia / RN 语义** 的工具类子集，继承与层叠按 **React Native 规则**（`View` 不继承文字样式，嵌套 `Text` 继承），详见 [技术调研报告 §15.14](./core/technical-research.md)（「Tailwind CSS 与原子化工具类」）。

| 任务                 | 详情                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| 构建期转换           | Babel / SWC / Vite 插件等：将 `className` 中的 utilities **编译为 `style` 对象**（思路参考 NativeWind / twrnc） |
| 支持子集与文档       | 明确 **支持的 utilities 列表** 与 **刻意不支持** 项（grid、复杂选择器、与 DOM 强绑定的类等）                    |
| 与 StyleSheet 的关系 | 与 Step 11 的 `StyleSheet.create` 并存：原子类展开结果仍应是普通对象，可再与数组 style 合并                     |
| 优先级说明           | **收益有限**：开发体验仍显著弱于 Web；维护映射与升级 Tailwind 主版本有持续成本，故排期 **最后、可不做**         |

**验收标准（若立项）：**

- 文档写明支持的工具类子集与 RN 继承语义
- 示例工程：`className` 写法在若干典型布局上与等价 `style` 渲染一致

---

## 里程碑与交付物

| 里程碑                     | 阶段              | 标志性能力                                                                            | 预估复杂度   |
| -------------------------- | ----------------- | ------------------------------------------------------------------------------------- | ------------ |
| **M1 — "看到矩形"**        | 阶段一 Step 1-3   | Yoga + CanvasKit + Reconciler，Flexbox 布局的嵌套 View 通过 Skia 绘制                 | 中高         |
| **M2 — "看到文字"**        | 阶段二 Step 4-5   | Text 换行（Skia Paragraph）、嵌套样式、省略号（**已交付**）                           | 高           |
| **M3 — "点得到"**          | 阶段三 Step 6     | 指针命中、`onClick` + 低级 `onPointer*`；`onPointerEnter` / `Leave` 等（**已交付**）  | 中           |
| **M4 — "完整 UI"**         | 阶段四 Step 8-9   | **Image + SvgPath（Step 8 已交付）**；ScrollView / `overflow` 裁剪（**Step 9 待办**） | 中           |
| **M5 — "高级绘制"**        | 阶段五 Step 10    | 阴影、渐变、clipPath、transform                                                       | 中           |
| **M6 — "生产就绪"**        | 阶段六 Step 11-15 | 动画、无障碍、FlatList、DevTools                                                      | 高           |
| **M6+ — Tailwind（可选）** | 阶段六 Step 16    | 构建期 `className` → `style`，**极低优先级**，不阻塞发布                              | 低（可不做） |

---

## 技术决策速查

在实现过程中遇到设计抉择时，参考以下决策表（详细论据见 [技术调研报告](./core/technical-research.md)）：

| 决策点              | 方案                                                                    | 参考来源                       |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------ |
| 布局引擎            | Yoga (WASM)，默认值对齐 RN                                              | 调研 §四                       |
| style API           | `style` prop 对象/数组，对齐 RN                                         | 调研 §三                       |
| 文字换行规则        | `whiteSpace` + `wordBreak` 模型                                         | 调研 §五（canvas-engine）      |
| 嵌套 Text           | 合并为单个段落绘制                                                      | 调研 §五（RN）                 |
| 文字测量 × Yoga     | Yoga measure 回调                                                       | 调研 §十一（Reconciler）       |
| 命中检测            | 包围盒（Yoga 布局结果）                                                 | 调研 §六（RN + canvas-engine） |
| 交互对外 API        | v1 以 **`onClick`** 为主；hover 用状态而非 CSS `:hover`                 | 阶段三设计说明                 |
| 事件传播            | **当前实现：冒泡**；捕获阶段可后续迭代                                  | 阶段三；`pointer-dispatch.ts`  |
| 帧调度              | rAF 帧合并 + React 18 batching                                          | 调研 §七（Konva）              |
| DPR 处理            | 自动 scale，style 统一逻辑像素                                          | 调研 §十三                     |
| 绘制后端            | 直接 CanvasKit (Skia WASM)                                              | 阶段一设计规格                 |
| Reconciler 触发重绘 | `resetAfterCommit` → `queueLayoutPaintFrame`                            | 调研 §十一（Ink）              |
| 动画执行路径        | 绕过 Reconciler，直接改节点属性                                         | 调研 §十二（Konva）            |
| 无障碍              | Proxy DOM 层 + ARIA 属性                                                | 调研 §十                       |
| 测试                | `vp test` + `vite-plus/test` 导入；headless 布局断言 + 像素对比（可选） | 调研 §十四；`AGENTS.md`        |
| Tailwind / 原子类   | 可选；构建期 className → style，子集 + RN 继承语义；**优先级极低**      | 调研 §15.14                    |
