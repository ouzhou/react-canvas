# React Canvas 开发阶段规划

> 基于 [技术调研报告](./technical-research.md) 的结论，结合项目当前进度，制定分阶段开发计划。

**说明：** 业务实现已清空，仓库保留 monorepo 与导出占位；下列除 monorepo 外均为待实现。

---

## 当前进度

| 模块                  | 状态      | 说明                                                |
| --------------------- | --------- | --------------------------------------------------- |
| monorepo 结构         | ✅ 完成   | `packages/core` + `packages/react` + `apps/website` |
| `ViewNode` 场景树     | ❌ 未开始 |                                                     |
| Reconciler HostConfig | ❌ 未开始 |                                                     |
| 绘制管线              | ❌ 未开始 |                                                     |
| Yoga 布局             | ❌ 未开始 |                                                     |
| CanvasKit (Skia)      | ❌ 未开始 | 阶段一直接使用 Skia，不经过 Canvas 2D               |
| Text 节点             | ❌ 未开始 |                                                     |
| 事件系统              | ❌ 未开始 |                                                     |
| Image 组件            | ❌ 未开始 |                                                     |
| 滚动 / 裁剪           | ❌ 未开始 |                                                     |
| 动画系统              | ❌ 未开始 |                                                     |
| 无障碍                | ❌ 未开始 |                                                     |

---

## 阶段总览

```
阶段一  核心渲染管线        ← 地基，所有后续功能的前提（直接使用 CanvasKit/Skia）
阶段二  文字能力            ← UI 的基本要素（使用 Skia Paragraph API）
阶段三  交互能力            ← 从"能看"到"能用"
阶段四  多媒体与滚动        ← 完整 UI 场景
阶段五  高级绘制能力        ← 阴影、渐变、clipPath、transform 等
阶段六  完善与打磨          ← 生产可用
```

---

## 阶段一：核心渲染管线

> 目标：嵌套的 `<View style={...} />` 能在 Canvas 上按照 Flexbox 规则正确布局，并通过 CanvasKit (Skia WASM) 绘制。
>
> 详细设计规格见 [phase-1-design.md](./phase-1-design.md)。

### Step 1 — Yoga 集成 + CanvasKit 初始化

**包：** `@react-canvas/core`

| 任务                    | 详情                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 安装 yoga-layout        | `yoga-layout`（官方 WASM 包，使用 `yoga-layout/wasm-async` 异步加载）                                                  |
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
| `Canvas` 组件    | 创建 Surface + Reconciler 容器，持有根 ViewNode 和 scheduleRender                      |
| rAF 帧合并       | `surface.requestAnimationFrame` 去重，同帧内多次 commit 只绘制一次                     |
| 脏标记           | `ViewNode` 增加 `dirty` 标志，`commitUpdate` 时标记                                    |
| 差量更新         | `prepareUpdate` 计算 style diff，无变化返回 `null` 跳过 commit                         |

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

### Step 4 — Text 节点基础

**包：** `@react-canvas/core` + `@react-canvas/react`

| 任务                  | 详情                                                                       |
| --------------------- | -------------------------------------------------------------------------- |
| `TextNode` 类型       | 新增节点类型，区别于 `ViewNode`                                            |
| Reconciler 扩展       | `createInstance` 支持 `"Text"` 类型；`createTextInstance` 创建文本叶子节点 |
| `getChildHostContext` | 传递"是否在 Text 内"的上下文，Text 内禁止嵌套 View                         |
| Yoga measure 回调     | `yogaNode.setMeasureFunc()`，用 Skia Paragraph API 返回文字宽高给 Yoga     |
| 绘制                  | `skCanvas.drawParagraph()` 在 Yoga 计算出的坐标绘制文字                    |
| 基础文字样式          | `fontSize`、`color`、`fontFamily`、`fontWeight`、`textAlign`               |

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

### Step 6 — 事件系统

**包：** `@react-canvas/core` + `@react-canvas/react`

| 任务         | 详情                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| DOM 事件监听 | Canvas 元素上监听 `pointerdown` / `pointermove` / `pointerup` / `wheel`                                |
| 坐标转换     | DOM 事件坐标 → Canvas 逻辑坐标（考虑 DPR、Canvas 偏移）                                                |
| 命中检测     | 基于 Yoga 布局结果的包围盒检测，从叶子节点向上遍历                                                     |
| 事件传播     | 捕获阶段（根 → 叶）+ 冒泡阶段（叶 → 根），对齐 RN                                                      |
| 合成事件     | 包装为统一事件对象：`locationX/Y`（相对节点）、`pageX/Y`（相对 Canvas）、`target`、`stopPropagation()` |
| 事件 props   | View 支持 `onPointerDown` / `onPointerUp` / `onPointerMove`                                            |

**验收标准：**

```tsx
<View
  style={{ width: 100, height: 100, backgroundColor: "blue" }}
  onPointerDown={(e) => console.log("点击", e.locationX, e.locationY)}
/>
```

### Step 7 — Pressable 组件

**包：** `@react-canvas/react`

| 任务             | 详情                                                                         |
| ---------------- | ---------------------------------------------------------------------------- |
| `Pressable` 封装 | 基于底层事件 API 封装 `onPress` / `onLongPress` / `onPressIn` / `onPressOut` |
| `hitSlop`        | 扩展触摸区域                                                                 |
| 按压状态         | `pressed` 状态驱动样式变化（如 `opacity: 0.7`）                              |
| 长按识别         | 定时器判断长按（默认 500ms）                                                 |

**验收标准：**

```tsx
<Pressable
  onPress={() => alert("clicked")}
  style={({ pressed }) => ({
    backgroundColor: pressed ? "#ddd" : "#fff",
    padding: 10,
  })}
>
  <Text>点我</Text>
</Pressable>
```

---

## 阶段四：多媒体与滚动

> 目标：支持图片展示和可滚动内容区域。

### Step 8 — Image 组件

**包：** `@react-canvas/core` + `@react-canvas/react`

| 任务             | 详情                                                       |
| ---------------- | ---------------------------------------------------------- |
| `ImageNode` 节点 | Reconciler 支持 `"Image"` 宿主类型                         |
| 异步加载         | fetch → `CanvasKit.MakeImageFromEncoded()` → 标记脏 → 重绘 |
| 绘制             | `skCanvas.drawImageRect()` 在 Yoga 计算的位置绘制          |
| 缓存             | URL → decoded `SkImage` 的 Map，避免重复解码               |
| 生命周期         | `onLoad` / `onError` 回调                                  |
| 尺寸             | 支持 `resizeMode`（cover / contain / stretch）             |

**验收标准：**

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

| 任务                | 详情                                   |
| ------------------- | -------------------------------------- |
| React DevTools 支持 | 确保场景树在 React DevTools 中可检查   |
| 布局调试模式        | 开发模式下渲染节点边框和布局信息叠加层 |
| API 文档            | 完善 `apps/website` 的组件 API 文档    |
| Playground          | 在线交互式 demo（可嵌入文档站）        |

---

## 里程碑与交付物

| 里程碑              | 阶段              | 标志性能力                                                            | 预估复杂度 |
| ------------------- | ----------------- | --------------------------------------------------------------------- | ---------- |
| **M1 — "看到矩形"** | 阶段一 Step 1-3   | Yoga + CanvasKit + Reconciler，Flexbox 布局的嵌套 View 通过 Skia 绘制 | 中高       |
| **M2 — "看到文字"** | 阶段二 Step 4-5   | Text 换行（Skia Paragraph）、嵌套样式、省略号                         | 高         |
| **M3 — "点得到"**   | 阶段三 Step 6-7   | 事件命中、Pressable 交互                                              | 中         |
| **M4 — "完整 UI"**  | 阶段四 Step 8-9   | Image + ScrollView                                                    | 中         |
| **M5 — "高级绘制"** | 阶段五 Step 10    | 阴影、渐变、clipPath、transform                                       | 中         |
| **M6 — "生产就绪"** | 阶段六 Step 11-15 | 动画、无障碍、FlatList、DevTools                                      | 高         |

---

## 技术决策速查

在实现过程中遇到设计抉择时，参考以下决策表（详细论据见 [技术调研报告](./technical-research.md)）：

| 决策点              | 方案                                  | 参考来源                       |
| ------------------- | ------------------------------------- | ------------------------------ |
| 布局引擎            | Yoga (WASM)，默认值对齐 RN            | 调研 §四                       |
| style API           | `style` prop 对象/数组，对齐 RN       | 调研 §三                       |
| 文字换行规则        | `whiteSpace` + `wordBreak` 模型       | 调研 §五（canvas-engine）      |
| 嵌套 Text           | 合并为单个段落绘制                    | 调研 §五（RN）                 |
| 文字测量 × Yoga     | Yoga measure 回调                     | 调研 §十一（Reconciler）       |
| 命中检测            | 包围盒（Yoga 布局结果）               | 调研 §六（RN + canvas-engine） |
| 事件传播            | 捕获 + 冒泡两阶段                     | 调研 §六（RN）                 |
| 帧调度              | rAF 帧合并 + React 18 batching        | 调研 §七（Konva）              |
| DPR 处理            | 自动 scale，style 统一逻辑像素        | 调研 §十三                     |
| 绘制后端            | 直接 CanvasKit (Skia WASM)            | 阶段一设计规格                 |
| Reconciler 触发重绘 | `resetAfterCommit` → `scheduleRender` | 调研 §十一（Ink）              |
| 动画执行路径        | 绕过 Reconciler，直接改节点属性       | 调研 §十二（Konva）            |
| 无障碍              | Proxy DOM 层 + ARIA 属性              | 调研 §十                       |
| 测试                | Vitest + headless 渲染断言 + 像素对比 | 调研 §十四                     |
