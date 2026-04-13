# 画布视口 resize：闪烁、白屏与布局错乱

**日期：** 2026-04-13  
**范围：** `@react-canvas/core-v2`（`SceneRuntime`）、`@react-canvas/react-v2`（`Canvas` / `SceneSkiaCanvas`）、`apps/v3` smoke 等宿主布局（可选）

---

## 1. 现象

- 浏览器窗口缩放后，整页或中间区域**闪白**、**短暂无内容**。
- 或 resize 后**中间主内容区空白**，侧栏/顶栏仍正常。
- 窄窗口下侧栏文字被压成**一字一行**（像竖排），或主区像「不渲染」。

---

## 2. 原因（人话）

### 2.1 把「改窗口大小」当成「重来一遍应用」

`Canvas` 组件的 `createSceneRuntime` Effect 依赖 `[width, height]`，每次 resize 都走 `setRuntime(null)` → 异步重建，中间有一段 `runtime === null` 导致渲染层返回 `null` → **白屏/闪烁**。

**要点：** 视口尺寸变化**不应**等价于销毁并重建整个场景运行时。

### 2.2 绘制链路被「先拆后装」打断

`SceneSkiaCanvas` 的 Effect 依赖也包含 `[width, height]`，每次都会 `detachSkia()` → 重新 `attachSceneSkiaPresenter`。而 attach 是异步的（需等待 CanvasKit 初始化），WebGL surface 建立前绘制订阅断开，产生**空帧空窗**。

**要点：** 改画布像素尺寸时往往要重建 WebGL surface，但应尽量**不断订阅**、只更新 canvas 尺寸与 surface，而不是把整个 presenter 生命周期和窗口 resize 绑死。

> **注：** surface 的重建本身是同步的（`ck.MakeWebGLCanvasSurface` 为同步调用），因此可以在 `subscribeAfterLayout` 回调里检测到视口变化时当场完成，**不引入额外空帧**。

### 2.3 同一帧里「根视口」和「子节点样式」顺序反了

`SceneSkiaCanvas` 若在 **`useLayoutEffect` 里同步**调用 `setViewportSize` → `runLayout`，而子树里各个 `View` 的 **`updateStyle` 还在后面才执行，则第一轮 Yoga 仍在用上一帧的节点宽高**，容易得到**错误布局快照**（例如主区宽度为 0），画出来就像**中间永远白/空**。

**要点：** 根视口更新宜放在**本轮所有 layout effect（含 View 样式同步）结束之后**。推荐做法是利用 React **由内向外** commit 的顺序——将 `setViewportSize` 放在最外层组件的 `useLayoutEffect` 里，保证子节点 `updateStyle` 先行；而不是依赖 `queueMicrotask`，后者在 React 18 concurrent mode 下不在批量更新边界内，可能导致中间态被意外绘制。

### 2.4 `emitLayoutCommit` 中 viewport 读取旧值

`SceneRuntime` 内部的 `emitLayoutCommit` 目前读取的是创建时的 `options.width`/`options.height`（值类型，不可变）。若后续实现 `setViewportSize`，直接修改根 Yoga 节点宽高并不会自动更新 `emitLayoutCommit` 里的 viewport 字段，**Skia presenter 读到的 `payload.viewport` 仍是旧尺寸**，导致 surface 尺寸与实际 canvas 不符。

**要点：** 引入一个可变的内部 `viewportRef = { width, height }`，`setViewportSize` 同步写入该对象，`emitLayoutCommit` 读取该对象而非 `options`。

### 2.5 presenter 内视口尺寸在 attach 阶段固化

`attachSceneSkiaPresenter` 在 attach 时将 `lw`/`lh` 固化为局部变量，后续 `subscribeAfterLayout` 回调不再重新读取 `payload.viewport`。resize 后 canvas 物理尺寸和 surface 均停留在旧值。

**要点：** 在 `subscribeAfterLayout` 回调里对比 `payload.viewport` 与当前 `lw/lh`，若发生变化则**同步**更新 canvas 的 `width`/`height`/`style`，并重建 surface（可复用已有 CanvasKit 实例，无需重新 await initCanvasKit）。

### 2.6 纯 UI：侧栏 + 主区宽度算错

若侧栏宽度公式在窄屏下使 **`侧栏宽 + 主区宽 > 窗口宽`**，或主区被算成 **0 宽**，与底层无关也会表现为「中间不渲染」。

**要点：** 侧栏/主区分配需保证 **`≤ vw`**，并为**主列**保留合理下限（产品决定）。此问题可**独立修复，与 core/react 层改动并行进行**。

---

## 3. 底层需要支持什么

| 能力                                                    | 说明                                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`SceneRuntime.setViewportSize(w, h)`**                | 更新内部可变 `viewportRef`，设置根 Yoga 尺寸，触发 `calculateLayout` / layout commit，**不**重建整棵树。                                                                  |
| **`getViewport()` 与 layout payload 一致**              | `emitLayoutCommit` 读 `viewportRef` 而非创建时的 `options`；`getViewport()` 同步返回最新值。                                                                              |
| **Presenter：视口变化时更新 canvas 与 surface**         | 在 `subscribeAfterLayout` 内对比 `payload.viewport` 与当前 `lw/lh`，变化时**同步**重新设置 canvas 尺寸、重建 surface；用整数比较避免 float 抖动导致每帧重建。             |
| **React：`Canvas` 不在 resize 时重建 runtime**          | `createSceneRuntime` 仅在挂载时执行（Effect 依赖 `[]`）；尺寸变化走 `setViewportSize`。                                                                                   |
| **React：`setViewportSize` 晚于 View 样式提交**         | 将调用放在最外层组件的 `useLayoutEffect` 中（React 由内向外 commit，子节点 `updateStyle` 先执行），避免依赖 `queueMicrotask` 带来的 concurrent mode 风险。                |
| **React：`SceneSkiaCanvas` Effect 不依赖 width/height** | presenter 的 attach/detach Effect 只依赖 `[runtime, paragraphFontProvider, defaultParagraphFontFamily]`，canvas 尺寸变化由 presenter 内部的 `subscribeAfterLayout` 处理。 |

---

## 4. 推荐实施顺序

1. **core-v2**：引入可变 `viewportRef`；实现 `setViewportSize`，根节点 `setWidth` / `setHeight` + `runLayout`；`emitLayoutCommit` 使用 `viewportRef`；`getViewport()` 返回 `viewportRef`。
2. **core-v2 `attachSceneSkiaPresenter`**：在 `subscribeAfterLayout` 回调里检测视口变化，同步更新 canvas 尺寸并重建 surface（复用已有 `ck` 实例）。
3. **react-v2 `Canvas`**：`createSceneRuntime` Effect 改为依赖 `[]`（仅挂载时执行）；在最外层 `useLayoutEffect([width, height])` 里调用 `runtime.setViewportSize`。
4. **react-v2 `SceneSkiaCanvas`**：Effect 依赖去掉 `width`/`height`，改为 `[runtime, paragraphFontProvider, defaultParagraphFontFamily]`；canvas 元素 `style.width`/`style.height` 由 presenter 内部控制，不再由 React props 驱动。
5. **apps/v3 smoke（可选，可并行）**：修正 `sidebarW` / `innerW`，避免窄屏主区为 0。

---

## 5. 原理一句话

**闪烁** = 某一帧没有有效绘制（runtime 为空、presenter 未订阅、或布局快照错误）。  
**正确做法** = **视口只缩放、场景保留** + **绘制订阅不断或极短空窗** + **根布局晚于子节点样式提交** + **viewport 可变引用保持一致** + **侧栏与主区宽度不自相矛盾**。

---

## 6. 参考代码位置（实现时）

- `packages/core-v2/src/runtime/scene-runtime.ts`：`createSceneRuntime`、`runLayout`、`emitLayoutCommit`、`options.width/height`（需改为可变 `viewportRef`）
- `packages/core-v2/src/render/scene-skia-presenter.ts`：`attachSceneSkiaPresenter`、`subscribeAfterLayout`、`lw`/`lh` 固化处（第 39-40 行）
- `packages/react-v2/src/canvas.tsx`：Effect 依赖 `[width, height]`（第 38 行）
- `packages/react-v2/src/scene-skia-canvas.tsx`：Effect 依赖 `[runtime, width, height, ...]`（第 59 行）
- `apps/v3/src/react-smoke.tsx`：侧栏与主区宽度

（具体行号随仓库演进会变，以实际文件为准。）
