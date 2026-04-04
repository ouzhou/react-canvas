# React Canvas 技术调研报告

> 调研目标：从 Konva / react-konva、Ink、React Native、minigame-canvas-engine 四个项目中汲取技术方案，围绕**结构设计、样式处理、布局排版、文字换行、事件系统、渲染管线与性能优化、图片与资源加载、滚动与裁剪、无障碍、Reconciler 实现、动画系统、高分屏与 DPR、测试**十三个维度展开对比分析，为 React Canvas 项目提供参考。

---

## 一、项目概览

| 项目                                                                                              | 定位                         | 渲染目标               | 布局引擎               | React 集成方式                   |
| ------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------- | ---------------------- | -------------------------------- |
| [Konva](https://github.com/konvajs/konva) / [react-konva](https://github.com/konvajs/react-konva) | HTML5 Canvas 2D 图形框架     | 浏览器 `<canvas>`      | 无内置布局（手动坐标） | Custom React Reconciler          |
| [Ink](https://github.com/vadimdemedes/ink)                                                        | 终端 CLI 的 React 渲染器     | 终端（ANSI 输出）      | Yoga (Flexbox)         | Custom React Reconciler          |
| [React Native](https://github.com/facebook/react-native)                                          | 跨平台原生应用框架           | iOS / Android 原生视图 | Yoga (Flexbox)         | Custom React Reconciler (Fabric) |
| [minigame-canvas-engine](https://github.com/wechat-miniprogram/minigame-canvas-engine)            | 微信小游戏轻量级 Canvas 引擎 | Canvas 2D              | 自研 Flexbox 子集      | 非 React（XML 模板 + 样式对象）  |

---

## 二、结构设计

### 2.1 Konva / react-konva

**节点树层级：**

```
Stage（根容器，绑定 DOM）
  └── Layer（独立 <canvas> 元素，含场景渲染器 + 命中检测渲染器）
        └── Group（逻辑分组，可嵌套）
              └── Shape（Rect / Circle / Text / Image 等图形原语）
```

- **所有节点继承自 `Konva.Node`**，提供位置、缩放、旋转、透明度、拖拽等通用属性。
- `Konva.Container`（Stage / Layer / Group）继承 `Konva.Node`，增加 `children` 管理能力。
- 每个 `Layer` 对应**两个 canvas**：场景渲染 canvas（用户可见）和命中检测 canvas（隐藏，用于像素级事件检测）。
- 渲染管线：调用 `stage.draw()` 时，依次对每个 Layer 清空 canvas → 遍历子节点绘制 → 合成最终输出。Layer 隔离使得局部更新时只需重绘受影响的 Layer。

**react-konva 的 React 集成：**

- 基于 `react-reconciler` 实现自定义渲染器，参照了 ReactArt 的模式。
- 每个 React 组件（`<Stage>`、`<Layer>`、`<Rect>` 等）对应一个 Konva 节点实例。
- `applyNodeProps()` 函数负责将 React props 差量同步到 Konva 节点属性（非严格模式下只更新变化的属性）。
- Konva 事件通过 `on` 前缀映射为 React props（如 `click` → `onClick`，`dragend` → `onDragEnd`）。
- 支持 `ref` 获取底层 Konva 节点实例，以便进行命令式操作（动画、Tween 等）。

**可借鉴点：**

- 双 canvas（场景 + 命中检测）的架构为事件处理提供了高性能方案。
- `applyNodeProps` 的差量更新模式可参考；Strict Mode 选项也很有价值。
- 但 Konva 是**图形原语模型**（Stage + Shape），不是组件模型——与 React Canvas 的 React Native 式组件模型差异较大。

### 2.2 Ink

**架构：**

```
React 组件树
    │  Custom Reconciler
    ▼
内部 DOM 树（DOMElement 节点）
    │  Yoga 布局计算
    ▼
ANSI 字符串输出 → Terminal
```

- Ink 实现了一个**自定义 React Reconciler**，将 JSX 映射到内部的 `DOMElement` 节点树。
- 宿主类型包括 `ink-box`（对应 `<Box>`）和 `ink-text`（对应 `<Text>`）。
- 每个 `DOMElement` 节点持有一个 **Yoga Node**，在渲染前进行 Flexbox 布局计算。
- 渲染输出是**字符矩阵**，通过 ANSI 转义序列控制颜色、样式、光标位置。
- `<Static>` 组件用于永久输出（如日志行），只渲染一次不再更新，实现了静态区域与动态区域的分离。

**可借鉴点：**

- **与 React Canvas 架构高度相似**：同样是 React Reconciler → 内部场景树 → 布局引擎 → 渲染输出的分层架构。
- Ink 的 Reconciler 实现可以作为 React Canvas 的直接参考模板。
- `<Static>` 分区渲染的思路值得借鉴（类似于 Canvas 中的"脏区域"优化）。

### 2.3 React Native

**新架构（Fabric）：**

```
React 组件树
    │  React Reconciler
    ▼
Shadow Tree（C++ 跨平台）
    │  Yoga 布局计算
    ▼
Host View Tree（iOS UIView / Android View）
```

- React Native 使用 `react-reconciler` 通过 **Fabric 渲染器** 将 React 元素映射到 Shadow Tree。
- Shadow Tree 是用 C++ 实现的跨平台层，负责存储组件的属性和布局信息。
- Yoga 在 Shadow Tree 上执行布局计算，结果通过 JSI（JavaScript Interface）同步传递到原生视图。
- 新架构的关键改进：同步 UI 管线、并发 React 支持、C++ 核心跨平台一致性。
- **Fantom** 是新的集成测试框架，在无设备环境下运行 JavaScript + Fabric + Yoga，可以检查布局结果。

**可借鉴点：**

- React Canvas 的目标是**复刻 React Native 的组件模型和 style 语义**，因此 RN 是最核心的参考目标。
- Shadow Tree → Yoga 布局 → 宿主渲染的三层架构与 React Canvas 的 场景树 → Yoga → Skia 完全对应。
- RN 的 StyleSheet 设计、style 属性扁平化、属性名规范都应保持一致。

### 2.4 minigame-canvas-engine

**架构：**

```
XML 模板 + Style 对象
    │  Layout.init() 解析
    ▼
渲染节点树
    │  自研布局计算
    ▼
Canvas 2D Context 绘制
```

- 不使用 React，采用**模板驱动**的方式：XML 定义结构，JavaScript 对象定义样式。
- 提供 6 种元素类型：`view`、`scrollview`、`image`、`text`、`bitmaptext`、`canvas`。
- `Layout` 是全局单例，通过 `clear → init → layout` 三步完成渲染。
- 事件系统基于触摸坐标与节点包围盒的命中检测。

**可借鉴点：**

- 作为轻量级 Canvas 渲染引擎，其自研布局系统的实现思路可供参考（尤其是不依赖 Yoga 时的退路方案）。
- 它的文字换行规则非常贴合 Web 标准（`whiteSpace` / `wordBreak`），值得学习。

---

## 三、样式处理

### 3.1 Konva

| 维度       | 说明                                                                             |
| ---------- | -------------------------------------------------------------------------------- |
| 样式形态   | 构造参数对象（flat 属性），如 `{ fill: 'red', stroke: 'black', strokeWidth: 2 }` |
| 支持的属性 | fill（颜色 / 渐变 / 图案）、stroke、shadow、opacity、visible、cornerRadius 等    |
| 文字样式   | fontFamily、fontSize、fontStyle、fontVariant、textDecoration、lineHeight、align  |
| 动态更新   | `node.setAttr(key, value)` 或 `node.fill('blue')` 等 getter/setter 方法          |
| 样式继承   | **无**。每个 Shape 独立配置，不从父节点继承样式                                  |

### 3.2 Ink

| 维度     | 说明                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------- |
| 样式形态 | JSX props，如 `<Box flexDirection="column" padding={1}>`                                        |
| 布局样式 | Yoga 支持的所有 Flexbox 属性（width / height / flex / margin / padding / gap 等）               |
| 视觉样式 | `<Text>` 支持 color、backgroundColor、bold、italic、underline、strikethrough、inverse、dimColor |
| 底层实现 | 文本颜色和样式通过 **chalk** 库转换为 ANSI 转义序列                                             |
| 样式继承 | `<Text>` 内部嵌套的 `<Text>` 会**继承**外层的样式（如颜色）                                     |
| 边框     | `<Box>` 支持 borderStyle（single / double / round / bold / classic / 自定义）、borderColor      |

### 3.3 React Native

| 维度       | 说明                                                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 样式形态   | `style` prop 接受对象或数组：`style={[styles.base, styles.active]}`                                                                     |
| StyleSheet | `StyleSheet.create()` 预处理样式对象，优化性能（编译时 ID 化）                                                                          |
| 布局样式   | 完整的 Yoga Flexbox 属性集                                                                                                              |
| 视觉样式   | backgroundColor、borderRadius、borderWidth / Color、shadow（iOS）、elevation（Android）、opacity、transform                             |
| 文字样式   | fontSize、fontWeight、fontFamily、fontStyle、color、textAlign、textDecorationLine、letterSpacing、lineHeight、textTransform、textShadow |
| 样式继承   | **仅 Text 组件**内部嵌套 Text 继承文字样式（fontSize、color 等）。View 不继承                                                           |
| 样式单位   | 默认 dp（密度无关像素），百分比支持部分属性                                                                                             |

### 3.4 minigame-canvas-engine

| 维度     | 说明                                                                                    |
| -------- | --------------------------------------------------------------------------------------- |
| 样式形态 | JavaScript 对象，键名采用 CSS 驼峰命名（如 `fontSize`、`backgroundColor`）              |
| 布局样式 | Flexbox 子集：flexDirection、justifyContent、alignItems、flexWrap、flex                 |
| 视觉样式 | backgroundColor、backgroundImage、opacity、borderRadius、borderWidth / Color、transform |
| 文字样式 | color、fontSize、fontWeight、fontFamily、textAlign、lineHeight、textStroke、textShadow  |
| 伪类支持 | `:active` 状态样式（v1.0.9+）                                                           |

### 样式系统对比总结

| 特性                | Konva | Ink         | React Native      | Canvas Engine |
| ------------------- | ----- | ----------- | ----------------- | ------------- |
| 样式复用机制        | 无    | 无          | StyleSheet.create | class 属性    |
| 样式继承            | 无    | Text 内继承 | Text 内继承       | 类 CSS 继承   |
| 样式合并            | 无    | N/A         | 数组合并          | class 合并    |
| 与 Web CSS 的接近度 | 低    | 中          | 中高              | 高            |

**React Canvas 应采纳的方案：** 与 React Native 保持一致——`style` prop 接受对象或数组、支持 `StyleSheet.create` 优化、Text 内部继承文字样式。

---

## 四、布局排版

### 4.1 Konva

- **无内置布局系统**。所有元素通过 `x` / `y` 坐标绝对定位。
- 开发者需手动计算位置、管理对齐和分布。
- 适合自由绘图场景，但不适合 UI 构建。

### 4.2 Ink

- 使用 **Yoga** 实现完整的 Flexbox 布局。
- 每个 `<Box>` 对应一个 Yoga Node，在渲染前计算布局。
- 支持的布局属性：
  - flexDirection、flexWrap、flexGrow、flexShrink、flexBasis
  - justifyContent、alignItems、alignSelf、alignContent
  - width / height / minWidth / minHeight / maxWidth / maxHeight
  - margin（全方向）、padding（全方向）、gap / columnGap / rowGap
  - position（relative / absolute）、top / right / bottom / left
  - display（flex / none）、overflow、aspectRatio
- 布局单位是**字符格**（column × row），而非像素。
- Yoga WASM 版本：已从 `yoga-wasm-web` 迁移到官方发布的 `yoga-layout@3.0.0`。

### 4.3 React Native

- 使用 **Yoga** 实现完整的 Flexbox 布局，是 Yoga 的"原产地"。
- 布局在 Shadow Tree 层（C++）中完成，结果通过 JSI 传递到原生视图。
- 与 Web CSS Flexbox 的差异：
  - 默认 `flexDirection: 'column'`（Web 默认 row）
  - 默认 `alignContent: 'flex-start'`（Web 默认 stretch）
  - 默认 `flexShrink: 0`（Web 默认 1）
  - 不支持 `float`、`grid`
- 支持百分比宽高、aspectRatio。
- 新架构下 Yoga 布局计算变为同步，减少了 UI 延迟。

### 4.4 minigame-canvas-engine

- **自研 Flexbox 子集**，不依赖 Yoga。
- 支持的布局属性：
  - flexDirection、justifyContent、alignItems、flexWrap、flex
  - position（relative / absolute）
  - width / height、margin（全方向）、padding（全方向）
  - borderWidth
- 不支持 flexGrow / flexShrink / flexBasis 的精细控制。
- 布局计算在 `Layout.init()` 阶段完成。

### 布局系统对比总结

| 特性           | Konva | Ink         | React Native | Canvas Engine |
| -------------- | ----- | ----------- | ------------ | ------------- |
| 布局引擎       | 无    | Yoga (WASM) | Yoga (C++)   | 自研          |
| Flexbox 支持度 | 无    | 完整        | 完整         | 子集          |
| 布局单位       | 像素  | 字符格      | dp / %       | 像素 / %      |
| 绝对定位       | 默认  | 支持        | 支持         | 支持          |
| Gap 支持       | 无    | 支持        | 支持         | 不确定        |

**React Canvas 应采纳的方案：** 使用 Yoga 引擎，与 React Native 的 Flexbox 语义保持一致（默认 column、flexShrink: 0 等）。

---

## 五、文字换行

### 5.1 Konva

- `Konva.Text` 提供三种换行模式（通过 `wrap` 属性控制）：
  - `'word'`（默认）：按单词边界换行，若单词过长仍会强制断行
  - `'char'`：按字符边界换行
  - `'none'`：不换行，可配合 `ellipsis: true` 显示省略号
- **文字测量**：使用 Canvas 原生 `context.measureText()` 计算文字宽度。
- **Unicode 支持**：`stringToArray()` 函数能正确处理 Emoji（含 ZWJ 序列、肤色修饰符）、旗帜符号、天城文等组合字符。
- 换行算法：设置 `width` 后，逐词（或逐字符）测量累加宽度，超出容器宽度时断行。
- 支持 `align: 'justify'`（两端对齐）。

### 5.2 Ink

- 文字换行在 Yoga 布局阶段处理。
- `<Text>` 的 `wrap` 属性控制换行行为：
  - `'wrap'`（默认）：自动换行
  - `'truncate'` / `'truncate-end'`：截断并显示省略号
  - `'truncate-start'`：开头截断
  - `'truncate-middle'`：中间截断
- 文字宽度以**字符宽度**为单位，使用 `string-width` 库处理全角字符和 Emoji 的宽度计算。
- 换行与 Yoga 的 `width` 约束联动——超出容器宽度的文字自动折行。

### 5.3 React Native

- 文字布局委托给**平台原生引擎**：
  - iOS：`NSAttributedString` + Core Text
  - Android：`android.text.Layout` (StaticLayout / DynamicLayout)
- Yoga 本身不处理文字换行，而是通过 **measure 回调** 向原生询问文字尺寸。
- 嵌套 `<Text>` 会合并为单个 attributed string / spannable，不是独立 Yoga 节点。
- 支持的文字控制属性：
  - `numberOfLines`：限制最大行数，超出部分截断
  - `ellipsizeMode`：截断模式（head / middle / tail / clip）
  - `textBreakStrategy`（Android）：simple / highQuality / balanced
  - `adjustsFontSizeToFit`（iOS）：自动缩小字号以适应容器
- **已知问题**：flex-basis 对文字宽度的测量存在不一致行为（fit-content vs max-content），PR #47435 修复了多行文字宽度应取容器满宽的问题。

### 5.4 minigame-canvas-engine

- v1.0.15 大幅重构了文字渲染，引入了**完整的 Web 标准换行规则**：
- **whiteSpace 属性**：

  | 值         | 空白符 | 换行符 | 自动换行 |
  | ---------- | ------ | ------ | -------- |
  | `normal`   | 合并   | 忽略   | 允许     |
  | `nowrap`   | 合并   | 忽略   | 禁止     |
  | `pre`      | 保留   | 保留   | 禁止     |
  | `pre-wrap` | 保留   | 保留   | 允许     |
  | `pre-line` | 合并   | 保留   | 允许     |

- **wordBreak 属性**：

  | 值          | 行为                                 |
  | ----------- | ------------------------------------ |
  | `normal`    | CJK 字符间可断行，英文在单词边界断行 |
  | `break-all` | 在任意字符间断行（包括英文单词中间） |

- 自动高度计算：不设 `height` 时，根据 fontSize、lineHeight 和换行结果自动计算。
- 垂直对齐：`verticalAlign` 控制文字在容器中的垂直位置。
- 文字截断：`text-overflow: ellipsis` 需配合 `white-space: nowrap` 使用。

### 文字换行对比总结

| 特性            | Konva              | Ink                 | React Native  | Canvas Engine      |
| --------------- | ------------------ | ------------------- | ------------- | ------------------ |
| 换行引擎        | Canvas measureText | Yoga + string-width | 平台原生      | 自研               |
| whiteSpace 控制 | 无                 | 无                  | 无            | 完整 5 种模式      |
| wordBreak 控制  | word / char / none | wrap / truncate-\*  | 平台依赖      | normal / break-all |
| CJK 支持        | 基础               | string-width        | 原生完整      | 明确规则           |
| 省略号          | ellipsis: true     | truncate-\*         | ellipsizeMode | text-overflow      |
| Unicode/Emoji   | stringToArray 处理 | string-width 处理   | 原生处理      | 未明确             |

**React Canvas 应采纳的方案：**

1. 文字测量使用 Skia（CanvasKit）的 `Paragraph` / `measureText` API。
2. 换行规则参考 **minigame-canvas-engine 的 whiteSpace + wordBreak 模型**——它是最贴合 Web 标准的方案。
3. 嵌套 Text 的处理参考 **React Native**——合并为单个富文本段落，而非独立布局节点。
4. 与 Yoga 的集成参考 **Ink / React Native** 的 measure 回调模式——Yoga 负责容器布局，文字节点通过回调返回测量结果。

---

## 六、事件系统

### 6.1 Konva

Konva 的事件系统是 Canvas 领域最成熟的实现之一，核心机制是**命中检测 Canvas（Hit Graph）**：

**命中检测原理：**

- 每个 Layer 维护一个**隐藏的 hit canvas**，与场景 canvas 尺寸相同。
- 每个 Shape 在 hit canvas 上以**唯一的颜色**绘制（颜色即 ID）。
- 当指针事件发生时，通过 `getImageData()` 读取 hit canvas 上对应坐标的像素颜色，反查出被点击的 Shape。
- 这种方式实现了**像素级精确**的命中检测，即使对不规则形状也完全准确。

**自定义命中区域：**

- `hitFunc`：自定义命中绘制函数，可以扩大/缩小/改变交互区域（如将星形的点击区域扩展为圆形）。
- `hitStrokeWidth`：单独设置命中检测时的线条宽度（用于线条更容易被点击）。
- `listening: false`：禁用节点的事件监听，跳过命中检测以提升性能。

**事件传播：**

- 支持**冒泡**：事件从被点击的 Shape 向上传播到 Group → Layer → Stage。
- 通过 `e.cancelBubble = true` 阻止冒泡。
- 支持事件委托：在 Stage 上监听事件，通过 `e.target` 判断来源。
- 支持 `fire()` 方法程序化触发事件。

**支持的事件类型：**

- 鼠标：click、dblclick、mousedown、mouseup、mouseover、mouseout、mouseenter、mouseleave、mousemove、wheel
- 触摸：touchstart、touchmove、touchend、tap、dbltap
- 拖拽：dragstart、dragmove、dragend
- 变换：transformstart、transform、transformend

**已知性能问题：** Firefox 下 `getImageData()` 性能远低于 Chrome，可能导致复杂场景的事件响应延迟。

### 6.2 Ink

Ink 的事件系统面向**终端键盘输入**，与图形界面的指针事件模型完全不同：

**输入处理：**

- `useInput(handler)` hook：监听键盘输入，回调参数 `(input, key)` 包含字符内容和按键信息（arrow、return、escape、ctrl、shift、tab、backspace 等）。
- `usePaste(handler)` hook：专门处理粘贴文本，自动启用 bracketed paste mode。
- 两者互不干扰——粘贴内容不会触发 `useInput`。
- `options.isActive` 参数可动态启停监听，避免多个组件同时处理输入。

**焦点管理：**

- `useFocus()` hook：组件获得焦点能力，返回 `isFocused` 状态。支持 `autoFocus`、`isActive`、`id` 配置。
- `useFocusManager()` hook：提供 `focusNext()`、`focusPrevious()`、`focus(id)` 方法，Tab/Shift+Tab 自动切换焦点。
- 焦点顺序按组件渲染顺序确定。

**Kitty Keyboard Protocol：** Ink 支持 kitty keyboard protocol，提供增强键盘输入（区分 Ctrl+I 与 Tab、报告按键/重复/释放事件、修饰键检测等）。

### 6.3 React Native

React Native 的事件系统分为两层：底层的 **Gesture Responder System** 和上层的 **Touchable / Pressable** 组件。

**Gesture Responder System（底层）：**

事件传播采用**两阶段模型**（与 DOM 一致）：

1. **捕获阶段（Top-Down）**：从根视图向下传播，调用 `onStartShouldSetResponderCapture` / `onMoveShouldSetResponderCapture`。
2. **冒泡阶段（Bottom-Up）**：从最深节点向上传播，调用 `onStartShouldSetResponder` / `onMoveShouldSetResponder`。

**Responder 协商机制：** 同一时刻只有一个 View 是"responder"（独占触摸焦点）。通过以下回调管理生命周期：

| 回调                            | 作用                           |
| ------------------------------- | ------------------------------ |
| `onStartShouldSetResponder`     | 触摸开始时是否要成为 responder |
| `onMoveShouldSetResponder`      | 触摸移动时是否要成为 responder |
| `onResponderGrant`              | 已成为 responder               |
| `onResponderMove`               | 手指移动中                     |
| `onResponderRelease`            | 触摸结束                       |
| `onResponderTerminationRequest` | 其他 View 请求接管             |
| `onResponderTerminate`          | responder 被夺走               |

**合成事件结构：** `nativeEvent` 包含 `changedTouches`、`touches`、`identifier`、`locationX/Y`（相对元素）、`pageX/Y`（相对根）、`timestamp`。

**PanResponder（手势识别）：** 封装了 Responder System，提供 `gestureState` 对象，包含 `dx/dy`（累计位移）、`vx/vy`（速度）、`numberActiveTouches` 等。

**上层组件：** `Pressable` 组件提供 `onPress`、`onLongPress`、`onPressIn`、`onPressOut`，以及 `hitSlop`（扩展触摸区域）、`pressRetentionOffset`（容错偏移）等便捷 API。

### 6.4 minigame-canvas-engine

Canvas Engine 的事件系统相对简单：

- 触摸事件在 `Layout.layout()` 渲染后自动绑定。
- 命中检测基于**包围盒**（Bounding Box），不是像素级检测。
- 需要调用 `Layout.updateViewPort(box)` 更新 Canvas 在屏幕上的位置信息，事件坐标才能正确计算。
- 支持的事件：touchstart、touchmove、touchend、tap、dbltap。
- 支持 `:active` 伪类状态样式。
- `Layout.getElementViewportRect(element)` 可获取元素的屏幕坐标，用于精确定位。

### 事件系统对比总结

| 特性           | Konva                    | Ink         | React Native                   | Canvas Engine |
| -------------- | ------------------------ | ----------- | ------------------------------ | ------------- |
| 命中检测方式   | 像素级（hit canvas）     | N/A（键盘） | 原生视图                       | 包围盒        |
| 事件传播       | 冒泡 + 委托              | 焦点轮转    | 捕获 + 冒泡                    | 简单绑定      |
| 自定义命中区域 | hitFunc / hitStrokeWidth | N/A         | hitSlop                        | 无            |
| 手势支持       | 拖拽                     | 无          | PanResponder / Gesture Handler | 基础拖拽      |
| 多点触摸       | 有限                     | N/A         | 完整                           | 无            |

**React Canvas 应采纳的方案：**

1. **命中检测**：优先采用**基于布局树的包围盒检测**（利用 Yoga 已经计算好的节点位置和尺寸），性能远优于 Konva 的 hit canvas 方案，且不需要额外的 canvas。对于不规则形状，可用 `CanvasKit.Path.contains()` 做路径级检测作为补充。
2. **事件传播**：对齐 React Native 的**两阶段模型**（捕获 + 冒泡），保持与 DOM/RN 一致的事件语义。
3. **Responder 系统**：参考 React Native 的 Responder 协商机制，确保同时只有一个节点独占触摸。
4. **上层 API**：提供 `Pressable` 式的便捷组件，支持 `hitSlop` 扩展触摸区域。
5. **合成事件**：将 DOM MouseEvent / TouchEvent 包装为统一的合成事件对象，结构参考 React Native 的 `nativeEvent`。

---

## 七、渲染管线与性能优化

### 7.1 Konva

- **批量绘制**：`batchDraw()` 将多次绘制调用合并到一帧，基于 `requestAnimationFrame` 限频。v8+ 默认自动批量处理。
- **Layer 隔离**：将频繁更新的元素和静态元素分到不同 Layer，只重绘变化的 Layer。
- **节点缓存**：`node.cache()` 将子树光栅化为位图缓存，后续绘制跳过矢量计算。支持 `pixelRatio` 参数控制缓存精度。
- **事件优化**：`listening: false` 跳过命中检测；`hitStrokeWidth: 0` 减少 hit canvas 绘制。
- **可见性裁剪**：手动实现视口裁剪（viewport culling），跳过屏幕外的节点绘制。

### 7.2 Ink

- **帧率限制**：`maxFps` 参数（默认 30）控制最大更新频率，减少 CPU 占用。
- **增量渲染**：`incrementalRendering: true` 模式只更新变化的行，减少闪烁。
- **Static 分区**：`<Static>` 组件的输出一次性写入终端，后续不再更新，减少重绘区域。
- **Console 拦截**：Ink 拦截 `console.*` 输出，先清空自身输出 → 写 console → 重绘自身，确保不混乱。

### 7.3 React Native（Fabric）

React Native 新架构的渲染管线分为三个阶段：

1. **Render 阶段**（JS 线程）：React 执行组件逻辑，生成 React Element Tree → 构建不可变的 C++ Shadow Tree。
2. **Commit 阶段**：将 Shadow Tree 提升为"下一棵待挂载的树"，调度 Yoga 布局计算。属性差异对比（diffing）在此阶段完成。
3. **Mount 阶段**（UI 线程）：带有布局信息的 Shadow Tree 转换为 Host View Tree，执行原生视图的创建/更新/删除。

**关键优化：**

- **View Flattening**：自动折叠纯布局用途的容器节点，减少原生视图层级。
- **事件优先级**：高优先级事件（如 onPress）立即处理，低优先级事件（如 onScroll）可合并。
- **不可变 Shadow Tree**：支持跨线程安全操作，配合 React 18 并发特性。
- **JSI 直传**：通过 JSI 直接访问 JS 值，避免 JSON 序列化开销。

### 7.4 minigame-canvas-engine

- 三步流程：`clear() → init() → layout()` 全量重建和重绘。
- 没有明确的增量更新或脏区域检测机制。
- 适合静态或低频更新的场景。

### 渲染管线对比总结

| 特性     | Konva               | Ink          | React Native             | Canvas Engine |
| -------- | ------------------- | ------------ | ------------------------ | ------------- |
| 更新策略 | Layer 级局部重绘    | 行级增量渲染 | Shadow Tree diff + Mount | 全量重建      |
| 批量更新 | batchDraw / rAF     | maxFps 限频  | 事件优先级 + 并发        | 无            |
| 缓存机制 | node.cache() 光栅化 | Static 区域  | View Flattening          | 无            |
| 帧调度   | rAF                 | 30fps 上限   | UI 线程同步              | 无            |

**React Canvas 应采纳的方案：**

1. **脏区域追踪**：场景树节点标记 dirty flag，只重新布局和绘制变化的子树。
2. **帧调度**：基于 `requestAnimationFrame` 合并同一帧内的多次更新（类似 Konva 的 batchDraw）。
3. **光栅化缓存**：对复杂静态子树缓存为 Skia Surface/Picture，减少重复绘制。
4. **渲染阶段分离**：参考 Fabric 的 Render → Commit → Paint 分阶段设计，在 Commit 阶段做 diff，在 Paint 阶段批量提交 Skia 绘制指令。

---

## 八、图片与资源加载

### 8.1 Konva

- `Konva.Image` 接受 HTML `Image` 对象作为 `image` 属性。
- 图片加载需手动处理：创建 `new Image()` → 设置 `onload` → 传入 Konva.Image。
- 无内置缓存机制，开发者自行管理。

### 8.2 Ink

- 终端环境不涉及图片渲染（有社区库 `ink-image` 用 ASCII art 显示图片，非核心场景）。

### 8.3 React Native

React Native 的 `Image` 组件提供了完整的图片加载管线：

**加载生命周期回调：**

| 回调          | 触发时机                 |
| ------------- | ------------------------ |
| `onLoadStart` | 开始加载                 |
| `onProgress`  | 加载进度（iOS）          |
| `onLoad`      | 加载成功，附带尺寸信息   |
| `onError`     | 加载失败                 |
| `onLoadEnd`   | 加载结束（无论成功失败） |

**占位与过渡：**

- `defaultSource`：加载期间显示的静态占位图（iOS）。
- `loadingIndicatorSource`：显示加载指示器。
- `fadeDuration`：加载完成后的淡入动画时长（Android，默认 300ms）。

**缓存策略（iOS `cache` 属性）：**

- `default`：遵循 URL 缓存策略
- `reload`：忽略缓存，强制请求
- `force-cache`：优先使用缓存
- `only-if-cached`：仅使用缓存

**静态图片预编译：** `require('./image.png')` 在打包时处理，自动获取尺寸信息，按 `@1x` / `@2x` / `@3x` 选择分辨率。

### 8.4 minigame-canvas-engine

- `<image>` 元素通过 `src` 属性指定图片路径。
- 依赖微信小游戏的资源加载机制。

### 图片加载对比总结

| 特性         | Konva        | Ink | React Native           | Canvas Engine |
| ------------ | ------------ | --- | ---------------------- | ------------- |
| 加载方式     | 手动 Image() | N/A | 组件声明式             | 模板声明式    |
| 生命周期回调 | 手动 onload  | N/A | 完整 6 个回调          | 无            |
| 缓存         | 无           | N/A | 平台原生缓存           | 平台依赖      |
| 占位图       | 无           | N/A | defaultSource          | 无            |
| 尺寸获取     | 手动         | N/A | 自动 / Image.getSize() | 自动          |

**React Canvas 应采纳的方案：**

1. 对齐 React Native 的 `Image` 组件 API：声明式 `source` prop、完整的生命周期回调。
2. 使用 CanvasKit 的 `MakeImageFromEncoded()` 解码图片，异步加载不阻塞渲染。
3. 内置图片缓存（URL → decoded SkImage 的 Map），避免重复解码。
4. 支持占位（加载中显示背景色或占位节点）、错误回退（onError 后显示 fallback）。

---

## 九、滚动与裁剪

### 9.1 Konva

- 无内置滚动机制。可通过拖拽 Stage 或 Group 模拟平移。
- 裁剪通过 `Group.clip({ x, y, width, height })` 实现矩形裁剪区域。
- 也支持通过 `clipFunc` 自定义裁剪路径。

### 9.2 Ink

- 终端环境通过系统滚动条处理（Ink 输出超出终端高度时自然滚动）。
- `overflowX` / `overflowY`（`visible` / `hidden`）控制 `<Box>` 的溢出行为。
- 无内置虚拟列表支持。

### 9.3 React Native

React Native 提供多层次的滚动方案：

**ScrollView：**

- 一次性渲染所有子元素，适合少量内容。
- 支持水平 / 垂直滚动、弹性效果、分页、嵌套。
- `contentContainerStyle` 控制内容区域样式。

**FlatList / VirtualizedList：**

- 基于 `VirtualizedList` 实现**虚拟化渲染**——只渲染可视区域内的元素。
- 不可见元素被卸载，替换为等高的空白占位。
- 关键性能参数：`windowSize`（渲染窗口倍数）、`maxToRenderPerBatch`（每批渲染数）、`initialNumToRender`（首屏数）。
- `removeClippedSubviews`：Android 上默认开启，从渲染树中分离不可见子视图。

**裁剪 / Overflow：**

- `overflow: 'hidden'` 裁剪超出容器的内容。
- Fabric 新架构在 iOS 上曾出现 `overflow: 'visible'` 不生效的问题（已修复）。

### 9.4 minigame-canvas-engine

- `<scrollview>` 元素支持可滚动列表。
- `overflow: 'hidden'` 裁剪溢出内容。

### 滚动与裁剪对比总结

| 特性             | Konva          | Ink      | React Native          | Canvas Engine |
| ---------------- | -------------- | -------- | --------------------- | ------------- |
| 滚动容器         | 无（手动模拟） | 系统滚动 | ScrollView / FlatList | scrollview    |
| 虚拟化           | 无             | 无       | VirtualizedList       | 无            |
| overflow: hidden | clip()         | 支持     | 支持                  | 支持          |
| 自定义裁剪路径   | clipFunc       | 无       | 无                    | 无            |

**React Canvas 应采纳的方案：**

1. `overflow: 'hidden'` 通过 Skia 的 `canvas.clipRect()` / `canvas.clipPath()` 实现。
2. 提供 `ScrollView` 组件：监听触摸/滚轮事件 → 更新内容偏移量 → 在 clip 区域内偏移绘制。
3. 提供 `FlatList` / 虚拟列表：参考 React Native 的 VirtualizedList 架构，只对可视区域内的子元素执行布局和绘制。
4. 滚动惯性、弹性回弹可参考 React Native 的 ScrollView 行为。

---

## 十、无障碍（Accessibility）

### 10.1 Canvas 的固有挑战

Canvas 渲染的内容是纯像素，对屏幕阅读器**完全不可见**。这是所有 Canvas 渲染方案的根本性挑战。

### 10.2 各方案的应对策略

**Konva：** 无内置无障碍支持。Canvas 元素对辅助技术不可见。

**Ink：** 内置了基础的屏幕阅读器支持：

- `isScreenReaderEnabled` 选项开启适配模式。
- `aria-role`（button / checkbox / list / progressbar 等）、`aria-state`（checked / disabled / expanded / selected）、`aria-label`、`aria-hidden` 属性。
- 屏幕阅读器模式下生成描述性文本输出（如 `(checked) checkbox: Accept terms`）。

**React Native：** 原生无障碍支持完整：

- `accessible`：标记组件为无障碍元素。
- `accessibilityRole`：语义角色（button / header / link / image 等）。
- `accessibilityLabel`：替代文本。
- `accessibilityHint`：操作提示。
- `accessibilityState`：状态（disabled / selected / checked / busy / expanded）。
- 直接映射到 iOS VoiceOver 和 Android TalkBack。

**minigame-canvas-engine：** 无无障碍支持。

### 10.3 业界实践

- **Proxy 元素方案**：在 Canvas 上方叠加不可见的 HTML 元素（`position: absolute; opacity: 0`），这些 DOM 元素携带 ARIA 属性，位置与 Canvas 内容对应。屏幕阅读器读取 DOM 元素，用户交互映射回 Canvas。
- **Canvas fallback content**：`<canvas>` 标签内部放置 fallback HTML 内容。
- **VisuallyHidden 组件**：React Aria 的 `VisuallyHidden` 将内容对视觉隐藏但对辅助技术可见。

**React Canvas 应采纳的方案：**

1. **Proxy DOM 层**：在 `<canvas>` 上方维护一层与场景树同构的隐藏 DOM 树，节点携带 `role`、`aria-label`、`aria-*` 属性，位置与 Canvas 节点对应。
2. **组件 API 对齐 React Native**：View / Text 组件支持 `accessible`、`accessibilityRole`、`accessibilityLabel`、`accessibilityState` 等 props。
3. 当 props 变化时，Reconciler 同时更新 Canvas 场景树和 Proxy DOM 树。
4. 焦点管理：将 Proxy DOM 的 focus 事件关联到 Canvas 内的高亮渲染。

---

## 十一、Reconciler 实现细节

各方案对 `react-reconciler` HostConfig 的实现是 React Canvas 动手编码的**第一步**，值得深入对比。

### 11.1 react-reconciler HostConfig 核心接口

`react-reconciler` 要求提供一个 HostConfig 对象（约 50+ 方法），关键方法如下：

| 方法                                                        | 作用                                | 调用时机                   |
| ----------------------------------------------------------- | ----------------------------------- | -------------------------- |
| `createInstance(type, props)`                               | 创建宿主节点实例                    | React 首次渲染或新增节点   |
| `createTextInstance(text)`                                  | 创建文本节点                        | 遇到纯文本子元素           |
| `appendInitialChild(parent, child)`                         | 首次渲染时添加子节点                | 初始化阶段（render phase） |
| `appendChild(parent, child)`                                | 追加子节点                          | commit phase 的变更操作    |
| `removeChild(parent, child)`                                | 移除子节点                          | commit phase               |
| `insertBefore(parent, child, before)`                       | 在指定节点前插入                    | commit phase               |
| `prepareUpdate(instance, type, oldProps, newProps)`         | 计算更新差异（返回 updatePayload）  | render phase               |
| `commitUpdate(instance, payload, type, oldProps, newProps)` | 应用属性更新                        | commit phase               |
| `finalizeInitialChildren(instance, type, props)`            | 首次渲染后的初始化                  | render phase 末尾          |
| `getRootHostContext()` / `getChildHostContext()`            | 传递上下文信息（如 Text 嵌套环境）  | 渲染过程中                 |
| `prepareForCommit()` / `resetAfterCommit()`                 | commit 前后的全局操作（如触发重绘） | commit phase 前后          |
| `shouldSetTextContent(type, props)`                         | 是否将 children 作为文本内容        | 决定节点类型               |

还需声明支持模式：`supportsMutation: true`（可变模式，适合 Canvas）或 `supportsPersistence: true`（持久化模式）。

### 11.2 各方案的 HostConfig 实现对比

**react-konva：**

- `createInstance(type, props)` → `new Konva[type](props)`，直接用 type 名查找 Konva 构造函数。
- `commitUpdate` → 调用 `applyNodeProps(instance, newProps, oldProps)`，差量更新属性。
- `appendChild` / `removeChild` → 调用 Konva 的 `add()` / `remove()` 方法。
- `prepareUpdate` → 简单返回 `{}`（总是标记需要更新），具体 diff 在 `commitUpdate` 中做。
- `shouldSetTextContent` → 始终返回 `false`（Konva 没有原生文本节点概念）。
- 严格模式（`_useStrictMode`）下 `commitUpdate` 强制同步所有属性，防止 React 状态与 Konva 节点漂移。

**Ink：**

- `createInstance(type)` → 创建 `DOMElement` 内部节点（`ink-box` / `ink-text`），同时创建关联的 Yoga Node。
- `createTextInstance(text)` → 创建 `TextNode`（纯文本叶子节点）。
- `commitUpdate` → 更新 DOMElement 上的 style 属性，同步更新 Yoga Node 的布局参数。
- `resetAfterCommit` → **触发完整的布局计算和终端渲染**（Yoga 计算 → 生成 ANSI 输出 → 写入 stdout）。
- `getChildHostContext` → 用于传递"是否在 Text 内"的上下文，Text 内不允许嵌套 Box。

**React Native（Fabric）：**

- `createInstance` → 在 C++ 层创建 Shadow Node，通过 JSI 调用。
- `commitUpdate` → 将 props diff 传递给 Shadow Node，触发 Shadow Tree 的不可变更新。
- `resetAfterCommit` → 调度 Yoga 布局计算 + Mount 阶段。
- 整个 HostConfig 实际上是 JSI 绑定层，大部分逻辑在 C++ 中。

### 11.3 对 React Canvas 的启示

| 关键决策               | 建议方案                                             | 参考来源                            |
| ---------------------- | ---------------------------------------------------- | ----------------------------------- |
| `createInstance`       | 创建场景树节点 + 关联 Yoga Node                      | Ink                                 |
| `createTextInstance`   | 创建 TextNode 叶子节点                               | Ink                                 |
| `commitUpdate`         | 差量更新节点属性 + 同步 Yoga 参数                    | react-konva 的 applyNodeProps + Ink |
| `resetAfterCommit`     | 触发 Yoga 布局 → Skia 重绘（可 batch）               | Ink                                 |
| `getChildHostContext`  | 传递 Text 嵌套上下文                                 | Ink                                 |
| `shouldSetTextContent` | 返回 false（Text 内容走 TextNode）                   | react-konva                         |
| `prepareUpdate`        | 计算 props diff，返回 updatePayload 以跳过无变化节点 | React Native                        |

---

## 十二、动画系统

### 12.1 Konva

Konva 提供两层动画 API：

**`Konva.Animation`（帧循环）：**

- 基于 `requestAnimationFrame` 的帧回调，每帧传入 `frame` 对象（`time`、`timeDiff`、`frameRate`）。
- 开发者在回调中手动修改节点属性。
- 适合复杂的、每帧需要自定义逻辑的动画。

**`Konva.Tween`（属性补间）：**

- 声明式：指定 `node`、目标属性值、`duration`、`easing`，引擎自动插值。
- 生命周期：`play()` / `pause()` / `reverse()` / `reset()` / `seek(t)` / `finish()`。
- 快捷方式：`node.to({ x: 100, duration: 1 })` 一行代码创建并播放。
- 内置 15+ 种缓动函数（Linear、EaseInOut、Bounce、Elastic、Back 等）。
- 支持 `onUpdate` / `onFinish` 回调。

**特点：** 命令式 API，动画直接修改 Konva 节点属性，绕过 React 状态更新。在 react-konva 中通过 `ref` 获取节点实例来操作。

### 12.2 Ink

- 终端环境无传统动画需求。
- `maxFps: 30` 控制渲染频率。
- 可通过 `useEffect` + `setInterval` 手动实现简单的"动画"效果（如 spinner、进度条）。
- 社区库 `ink-spinner` 提供旋转动画组件。

### 12.3 React Native

React Native 提供两套动画方案：

**`Animated` API（内置）：**

- 核心概念：`Animated.Value` → 通过 `Animated.timing` / `spring` / `decay` 驱动 → 绑定到 `Animated.View` 的 style。
- `useNativeDriver: true` 将动画序列化后发送到 UI 线程执行，**绕过 JS 线程**，保证 60fps。
- 支持 native driver 的属性：transform（translateX/Y、scale、rotate）、opacity。**不支持** layout 属性（width、height、margin 等）。
- 组合动画：`Animated.parallel()`、`Animated.sequence()`、`Animated.stagger()`。
- 手势联动：`Animated.event()` 将手势数据映射到动画值（如滚动位置驱动动画）。

**`Reanimated`（社区，准官方）：**

- 核心概念：**Worklets**（编译为原生字节码的 JS 函数，在 UI 线程执行）+ **Shared Values**（跨线程可变数据容器）。
- `useAnimatedStyle(worklet)` 将 shared values 映射到样式。
- `withTiming` / `withSpring` / `withDecay` 作为动画驱动器。
- **关键优势**：即使 JS 线程繁忙也能保持 60+ fps；支持**所有**样式属性的 native 动画（包括 layout 属性）。
- 与手势系统（react-native-gesture-handler）深度集成。

### 12.4 minigame-canvas-engine

- 无内置动画系统。
- 需要手动用 `requestAnimationFrame` 循环重绘。

### 动画系统对比总结

| 特性        | Konva                 | Ink | React Native                 | Canvas Engine |
| ----------- | --------------------- | --- | ---------------------------- | ------------- |
| 动画模型    | 命令式 Tween + 帧循环 | 无  | 声明式 Animated / Reanimated | 无            |
| 插值能力    | 内置 15+ 缓动         | N/A | timing / spring / decay      | N/A           |
| 线程模型    | JS 主线程             | N/A | Native Driver → UI 线程      | JS 主线程     |
| Layout 动画 | 手动                  | N/A | Reanimated 支持              | 无            |
| 手势联动    | 拖拽事件              | N/A | Animated.event / GH          | 无            |

**React Canvas 应采纳的方案：**

1. **基础层**：提供 `Animated.Value` + `Animated.timing/spring` 的 API，对齐 React Native 的 Animated 接口。
2. **执行策略**：Canvas 场景下不存在 JS → Native 桥接开销，但动画更新仍应跳过 React reconcile 路径——直接修改场景树节点属性并触发重绘，类似 Konva 的方式。
3. **缓动函数**：内置常用缓动（linear、easeInOut、spring、bounce），参考 Konva 的 Easings。
4. **手势联动**：动画值可绑定到触摸事件位移，实现拖拽跟手。

---

## 十三、高分屏与 DPR 处理

### 13.1 Canvas 的 DPR 问题

Canvas 的 `width` / `height` 属性设置的是**物理像素**尺寸，而 CSS 的 `width` / `height` 控制的是**逻辑像素**显示尺寸。在高分屏（`devicePixelRatio > 1`）上，如果两者相同，Canvas 内容会模糊。

标准解决方案：

```js
canvas.width = logicalWidth * devicePixelRatio;
canvas.height = logicalHeight * devicePixelRatio;
canvas.style.width = logicalWidth + "px";
canvas.style.height = logicalHeight + "px";
ctx.scale(devicePixelRatio, devicePixelRatio);
```

### 13.2 各方案的处理方式

**Konva：**

- 自动检测 `window.devicePixelRatio`，创建 canvas 时自动放大物理尺寸。
- `stage.getPixelRatio()` / `stage.setPixelRatio(ratio)` 手动控制。
- 导出图片时支持 `pixelRatio` 参数（如 `stage.toDataURL({ pixelRatio: 2 })`）。
- **已知问题**：浏览器缩放或窗口在不同 DPI 显示器间移动时，不会自动更新 pixelRatio，需手动监听 `matchMedia` 变化并重设。
- Buffer canvas（用于 opacity 复合）也需要单独设置 pixelRatio。

**Ink：**

- 终端环境不涉及 DPR 问题。

**React Native：**

- `PixelRatio.get()` 获取设备 DPR。
- `PixelRatio.roundToNearestPixel(size)` 将逻辑尺寸对齐到最近的物理像素。
- 图片资源自动按 `@1x` / `@2x` / `@3x` 选择对应分辨率。
- 布局系统使用 dp（逻辑像素），Yoga 输出的布局值经过 `PixelRatio` 转换后传递给原生视图。
- `StyleSheet.hairlineWidth` 提供 1 物理像素宽度的值。

**minigame-canvas-engine：**

- 依赖微信小游戏的 Canvas DPR 处理机制。

### 13.3 对 React Canvas 的启示

| 关键决策        | 建议方案                                                        |
| --------------- | --------------------------------------------------------------- |
| Canvas 尺寸设置 | 物理尺寸 = 逻辑尺寸 × DPR，自动处理                             |
| Skia 绘制       | CanvasKit Surface 创建时传入 DPR，Skia 内部 scale               |
| 布局系统        | Yoga 使用逻辑像素，布局结果 × DPR 后传给 Skia                   |
| 对外 API        | style 中的数值均为逻辑像素（与 RN 一致）                        |
| DPR 变化        | 监听 `matchMedia('(resolution: Xdppx)')` 变化，自动重建 Surface |
| 图片            | 加载时考虑 DPR，高分屏自动请求 @2x/@3x 资源                     |
| 像素对齐        | 提供 `PixelRatio.roundToNearestPixel()` 工具，避免亚像素模糊    |

---

## 十四、测试

### 14.1 Konva / react-konva

- Konva 使用 **Mocha + Chai** 作为测试框架。
- 测试策略以**像素级对比**为主：渲染结果导出为 dataURL，与基准图像比对。
- react-konva 的测试使用 Jest + React Testing Library。
- 测试重点：props 同步正确性、事件触发、节点树结构。

### 14.2 Ink

- 官方提供 **ink-testing-library** 测试工具：

  ```ts
  import { render } from 'ink-testing-library';

  const { lastFrame, frames, rerender, stdin } = render(<MyComponent />);
  // lastFrame() 返回最后一帧的终端输出字符串
  // stdin.write('q') 模拟用户输入
  ```

- **核心 API**：
  - `render(tree)` → 渲染组件，返回测试工具对象
  - `lastFrame()` → 获取最后一帧输出的字符串
  - `frames` → 所有帧的数组
  - `rerender(tree)` → 更新组件 props
  - `stdin.write()` → 模拟键盘输入
  - `unmount()` → 卸载组件
- 测试模式：断言渲染输出的字符串内容。

### 14.3 React Native

- **Jest** 作为默认测试框架，内置 mock 环境。
- **React Native Testing Library (RNTL)**：推荐的组件测试方案，基于用户行为测试。
- **Fantom**（新架构）：集成测试框架，在无设备的 headless 环境中运行完整的 JS + Fabric + Yoga 管线，可检查布局计算结果。
- 端到端测试：Detox / Appium。
- 快照测试：Jest snapshot。

### 14.4 minigame-canvas-engine

- 测试信息较少，项目中有 `test/` 目录但未见完整的测试框架文档。
- 提供 **Playground**（CodePen 在线 demo）用于可视化调试。

### 测试方案对比总结

| 特性         | Konva        | Ink                        | React Native         | Canvas Engine |
| ------------ | ------------ | -------------------------- | -------------------- | ------------- |
| 测试框架     | Mocha + Chai | Jest + ink-testing-library | Jest + RNTL + Fantom | 未明确        |
| 单元测试     | 支持         | 支持                       | 支持                 | 基础          |
| 渲染输出断言 | 像素对比     | 字符串对比                 | 组件树 + 布局值      | 可视化        |
| 布局测试     | 无           | 可通过输出推断             | Fantom 直接检查      | 无            |
| 输入模拟     | 事件 mock    | stdin.write                | fireEvent            | 无            |

**React Canvas 应采纳的方案：**

1. 参考 **ink-testing-library** 的设计理念，提供 `render()` → `lastFrame()` 的测试工具，将 Canvas 渲染结果序列化为可断言的格式。
2. 参考 **Fantom** 的 headless 测试模式——在 Node.js 环境中运行 React Reconciler + Yoga + CanvasKit（WASM），无需浏览器即可验证布局和绘制结果。
3. 像素级回归测试参考 **Konva** 的 dataURL 对比方案。

---

## 十五、综合技术方案建议

基于以上调研，为 React Canvas 项目给出以下建议：

### 15.1 结构设计

采用 **Ink / React Native 的三层架构**：

```
React Reconciler → 可变场景树（类似 Shadow Tree）→ Yoga 布局 → Skia 绘制
```

- 场景树节点设计参考 Ink 的 `DOMElement`：每个节点持有 Yoga Node 和绘制属性。
- 宿主组件类型参考 React Native：`View`、`Text`、`Image` 等。

### 15.2 样式处理

- 完全对齐 **React Native 的 style 规范**：`style` prop 接受对象或数组。
- 支持 `StyleSheet.create()` 进行样式预处理与优化。
- Text 组件内部嵌套 Text 继承文字样式（fontSize、color 等），View 不继承。

### 15.3 布局排版

- 使用 **Yoga** 作为布局引擎，对齐 React Native 的 Flexbox 默认值。
- 支持 gap、aspectRatio 等较新的 Yoga 特性。
- 布局单位为像素，支持百分比。

### 15.4 文字换行

- 文字测量使用 Skia 的 Paragraph API（CanvasKit 的 `ParagraphBuilder`）。
- 与 Yoga 的集成采用 **measure 回调模式**（参考 React Native）。
- 换行规则优先级：
  1. 基础方案：React Native 的 `numberOfLines` + `ellipsizeMode`
  2. 进阶方案：参考 minigame-canvas-engine 的 `whiteSpace` + `wordBreak` 模型
- 嵌套 Text 合并为单个 Paragraph 绘制（参考 React Native 的 attributed string 模式）。
- Unicode / Emoji 处理参考 Konva 的 `stringToArray()` 或使用 Intl.Segmenter。

### 15.5 事件系统

- **命中检测**：基于 Yoga 布局结果的包围盒检测，辅以 Skia Path 路径检测。
- **事件传播**：对齐 React Native 的捕获 + 冒泡两阶段模型。
- **Responder 协商**：参考 React Native 的 Gesture Responder System，确保触摸独占。
- **上层 API**：提供 `Pressable` 组件，支持 `hitSlop`、`onPress`、`onLongPress`。
- **合成事件**：DOM 事件 → 统一合成事件对象，包含 `locationX/Y`（相对节点）、`pageX/Y`（相对 Canvas）。

### 15.6 渲染管线与性能优化

- **脏标记**：场景树节点标记 dirty flag，只重新布局和绘制变化的子树。
- **帧调度**：`requestAnimationFrame` 合并同帧多次更新。
- **光栅化缓存**：对静态子树缓存为 Skia Picture/Surface。
- **阶段分离**：Render（React diff）→ Commit（场景树更新 + Yoga 布局）→ Paint（Skia 绘制）。

### 15.7 图片与资源加载

- 声明式 `Image` 组件，对齐 React Native API（source、onLoad、onError）。
- CanvasKit `MakeImageFromEncoded()` 异步解码，不阻塞渲染。
- 内置 URL → SkImage 缓存，支持占位和错误回退。

### 15.8 滚动与裁剪

- `overflow: 'hidden'` 通过 Skia `clipRect()` / `clipPath()` 实现。
- 提供 `ScrollView` 组件（触摸/滚轮 → 偏移量 → clip 区域内偏移绘制）。
- 提供虚拟列表（参考 VirtualizedList 架构，只布局和绘制可视区域）。

### 15.9 无障碍

- 在 Canvas 上方维护 Proxy DOM 层，节点携带 ARIA 属性，位置与 Canvas 对应。
- 组件 API 对齐 React Native：`accessible`、`accessibilityRole`、`accessibilityLabel`。
- Reconciler 同时更新 Canvas 场景树和 Proxy DOM 树。

### 15.10 Reconciler 实现

- `createInstance` 创建场景树节点 + Yoga Node（参考 Ink）。
- `commitUpdate` 差量更新属性 + 同步 Yoga 参数（参考 react-konva 的 `applyNodeProps`）。
- `resetAfterCommit` 触发 Yoga 布局 → Skia 重绘。
- `getChildHostContext` 传递 Text 嵌套上下文。

### 15.11 动画系统

- 提供 `Animated.Value` + `timing/spring` API（对齐 React Native）。
- 动画更新跳过 React reconcile，直接修改场景树节点属性。
- 内置常用缓动函数。
- 手势联动：动画值绑定触摸位移。

### 15.12 高分屏与 DPR

- Canvas 物理尺寸 = 逻辑尺寸 × DPR，自动处理。
- Yoga 使用逻辑像素，布局结果 × DPR 后传给 Skia。
- style 数值统一为逻辑像素（与 RN 一致）。
- 监听 DPR 变化自动重建 Surface。
- 提供 `PixelRatio.roundToNearestPixel()` 工具函数。

### 15.13 测试

- 提供类似 ink-testing-library 的 **headless 渲染测试工具**。
- 支持布局结果的结构化断言（节点位置、尺寸）。
- 支持像素级回归测试（Skia 渲染结果导出为图片对比）。
- 使用 Vitest 作为测试框架（与项目工具链一致）。

---

## 附录：参考资源

- [Konva.js 官方文档](https://konvajs.org/docs/overview.html)
- [react-konva GitHub](https://github.com/konvajs/react-konva)
- [Ink GitHub](https://github.com/vadimdemedes/ink)
- [ink-testing-library](https://github.com/vadimdemedes/ink-testing-library)
- [React Native 架构文档](https://reactnative.dev/architecture/fabric-renderer)
- [React Native 渲染管线](https://reactnative.dev/docs/next/render-pipeline)
- [React Native Fantom 测试框架](https://github.com/facebook/react-native/tree/main/private/react-native-fantom)
- [Yoga 布局引擎](https://yogalayout.dev/)
- [minigame-canvas-engine 文档](https://wechat-miniprogram.github.io/minigame-canvas-engine/)
- [minigame-canvas-engine Text 组件](https://wechat-miniprogram.github.io/minigame-canvas-engine/components/text.html)
