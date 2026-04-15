# `@react-canvas/core-v2`

画布场景运行时：**Yoga 布局**、**命中测试**、**指针派发**、**CanvasKit/Skia 绘制**（与 `@react-canvas/react-v2` 解耦，React 只消费本包 API）。

---

## 模块概览

| 模块             | 作用                                                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **runtime**      | `createSceneRuntime`：`insertView` / `insertImage` / `insertSvgPath` / `removeView` / `updateStyle`、视口、`subscribeAfterLayout`、`dispatchPointerLike`、`addListener`、`getLastDispatchTrace`                        |
| **init-runtime** | `initRuntime`：Yoga + CanvasKit 单例；`subscribeRuntimeInit` / `getRuntimeSnapshot` / `getRuntimeServerSnapshot`（供 React `useSyncExternalStore`）                                                                    |
| **layout**       | `ViewStyle` → Yoga（`style-map`）；`calculateAndSyncLayout`、`absoluteBoundsFor`（相对父级与舞台绝对盒）                                                                                                               |
| **hit**          | `hitTestAt(stageX, stageY)`：轴对齐矩形命中，**兄弟节点从最后一个子节点向前 DFS**；命中最深节点                                                                                                                        |
| **events**       | `PointerEventType` 含 `pointermove` / `pointerenter` / `pointerleave` 等；`ScenePointerEvent`（`stopPropagation`）；`dispatchPointerLike`（捕获 → 冒泡）；`EventRegistry`                                              |
| **input**        | `attachCanvasStagePointer`：`pointermove`（`requestAnimationFrame` 每帧合并一次）、`pointerdown` / `pointerup`、画布 `pointerleave` → `notifyPointerLeftStage`；`pointerup` 主键时额外 `click`；`clientXYToStageLocal` |
| **render**       | `initCanvasKit`、`attachSceneSkiaPresenter`：订阅布局提交 → Skia 绘制（含 **`Image`** 位图与 **`SvgPath`** 矢量，`d` + 默认 `viewBox` `0 0 24 24`）                                                                    |
| **geometry**     | `canvasBackingStoreSize`：backing store 与 DPR 对齐                                                                                                                                                                    |

设计说明见仓库根目录 `docs/core-design.md`（§2.2 与运行时初始化相关）。

### SkSL 全屏后处理（实验）

`attachSceneSkiaPresenter` 的 `postProcess` 可选：在 **WebGL** 下先将整帧场景画到 **独立离屏 Surface**（与 pick 缓冲分离），再经 `CanvasKit.RuntimeEffect` 全屏画到主 canvas。`MakeSWCanvasSurface` 回退时 **不启用** 后处理，并触发 `onPostProcessDisabled('software-surface')`；SkSL **编译失败** 时触发 `compile-failed` 并回退为无后处理绘制。

- **SkSL**：在 `attach` 时传入一次；须声明 **恰好一个** `shader` 子节点，例如：

  ```text
  uniform shader uScene;
  half4 main(float2 p) {
      return uScene.eval(p);
  }
  ```

- **Uniform**：通过 `getUniforms(ctx)` 返回 `Record<string, number | Float32Array | number[]>`，键名与 SkSL 中 `uniform` 名一致；未提供的分量填 `0`。
- **`continuousRepaint`**：为 `true` 时每帧 `requestAnimationFrame` 触发绘制（用于跟手透镜等仅 uniform 变化的场景）；否则仍在布局提交后绘制。

---

## 命中测试（当前约定，无 zIndex）

- **命中形状**：节点布局得到的 **轴对齐矩形**（`absoluteBoundsFor`），左闭右开：`[left, left+width)`、`[top, top+height)`。
- **叠盖**：同一父级下 **后插入的子节点优先**（`children` 数组末尾优先）；深度优先，返回 **最深** 命中节点。
- **`pointerEvents`（第一期）**：`style.pointerEvents` 为 **`none`** 时该节点及子树不参与命中；未设置或 **`auto`** 为默认。`box-none` / `box-only` 未实现。

## 绘制顺序（无 zIndex）

- **Skia**：与 `hitTestAt` 一致——**前序 DFS**：先画当前节点（若有 `backgroundColor`），再按 `children` **正序（0→n−1）**递归子树；同一父下 **后插入的兄弟后绘制**，叠在上层。
- **`overflow: hidden|scroll`**：子树绘制经 **`clipRect` / `clipRRect`** 裁在父布局盒内；**`borderRadius`**（快照内为 `borderRadiusRx`/`Ry`）同时作用于背景圆角与裁剪形状。命中仍按轴对齐盒，与视觉圆角/裁剪可不一致。
- **半透明**父背景仍会叠在子之下；需不透明底或分层设计，勿用面积等启发式改绘制序。

---

## 指针（当前）

- **合成 enter / leave（方案 A）**：内部维护上一命中叶；仅当 **叶** 变化时依次派发 **`pointerleave`（旧叶）→ `pointerenter`（新叶）→ 主事件**（如 `pointermove` / `pointerdown`）；不为祖先链单独合成 enter/leave。无对外 **`hoverTargetId`** getter。
- **`layoutDirty`**：`insertView` / `removeView` / `updateStyle` 会置脏并在这些方法内 **`calculateAndSyncLayout`**；**仅指针派发**且树未变时，干净路径 **不** 跑全量 Yoga，直接 `hitTestAt`（依赖已缓存的 `node.layout`）。`getLayoutSnapshot()` 在脏时仍会同步布局。
- **`pointermove`** 落在空白处时只合成 leave（若有旧叶），不沿路径派发 `pointermove`。
- 调试：`getLastDispatchTrace()` 可观察同一次派发中的合成段与主事件段。

---

## P0 路线图（与实现状态对照）

| 代号     | 内容                                                                                          | 状态                                                        |
| -------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **P0-1** | 命中规则 + **`pointerEvents`: auto/none**；零面积等边界写清；zIndex 仍不做                    | `auto`/`none` 已有；`box-*` 与边界细则待补                  |
| **P0-2** | `pointerdown`/`pointerup` 与 **`pressed` 语义**（含与 react-v2 `View` 对齐）                  | 部分（监听有，无统一 pressed 模型）                         |
| **P0-3** | **`click` 规则**（与 down/up 目标一致、移动阈值等，按产品定）                                 | 有 `click` 派发，规则可收紧                                 |
| **P0-4** | **`pointermove`** + 上一目标缓存 + **enter/leave（hover）** + 性能（节流/避免无订阅全量命中） | `pointermove` + rAF 合并；`layoutDirty`；方案 A enter/leave |
| **P0-5** | **`View` 的 `style` 支持函数**：`({ pressed, hovered }) => ViewStyle`，纯外观不触发布局       | 部分：`({ hovered }) => ViewStyle`（react-v2）              |

---

## P1 规划（与优先级）

| 代号     | 内容                                                                                                                                  | 状态   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **P1-A** | **Layer / 类 RN Modal**：`modalLayer`、按层叠放、`captureEvents` 阻断低层指针；与 React Portal 挂到指定 Layer 根（见设计文档 §4）     | 未开始 |
| **P1-B** | **`ViewStyle` 过渡 / 动画**：时间轴或声明式 transition，对可动画属性插值并驱动 `updateStyle`（布局与绘制策略需单独约定）              | 未开始 |
| **P1-C** | **`ViewStyle.cursor`**：命中链解析 + 写入 `canvas.style.cursor`（见 `docs/superpowers/specs/2026-04-11-view-style-cursor-design.md`） | 未开始 |

**先做 Modal 还是先做 style transition？**

- **更依赖引擎、且文档已论证应优先补齐的是 Layer / Modal 能力**：单棵树仅靠 `zIndex` 无法可靠得到「顶层渲染 + 打开时底层不响应」的 RN 式语义；见 `docs/core-design.md` **§4 Layer**。
- **style transition** 更多是体验与 API 形态：在 core 内置插值之前，仍可用 **`requestAnimationFrame` + 逐帧 `updateStyle`** 做淡入淡出等；不阻塞你先做 **弹窗/遮罩** 的产品路径。
- **建议顺序**：若近期要 **Dialog / 全屏遮罩 / 菜单顶层交互**，优先 **P1-A（Layer + modalLayer）**；待交互分层稳定后，再上 **P1-B** 或与 Modal 进入动效需求同步推进。需要浏览器级光标反馈时可并行或小步落地 **P1-C**。
