# Pick Buffer Hit Detection Design

**Date:** 2026-04-13  
**Status:** Approved  
**Topic:** 用颜色拾取（Color Picking / ID Rendering）替换当前基于布局盒的命中检测（`hitTestAt`）

---

## 背景与动机

当前 `hitTestAt`（`packages/core-v2/src/hit/hit-test.ts`）在以下场景下存在已知缺陷：

- 父节点设有固定 `height`，子内容溢出（`overflow: visible`）时，子节点超出父盒的部分无法命中
- `border-radius` / `overflow: hidden` 的视觉裁剪区与命中盒不一致
- `scrollView` 逆坐标变换与浮点布局高度叠加时容易产生边界漏判

颜色拾取方案与 Skia 主帧走**完全相同的绘制路径**（clip、RRect、scroll translate），命中精度和像素级视觉严格一致，根本上解决上述问题。

---

## 决策汇总

| 维度                  | 决策                                                         |
| --------------------- | ------------------------------------------------------------ |
| 更新时机              | 每次 `subscribeAfterLayout` 触发后同步重画 pick 纹理         |
| pick 纹理分辨率       | 与主画布 backing store 完全一致（同 DPR、同 `bw × bh`）      |
| pick 纹理载体         | CanvasKit `MakeSurface`（软件离屏 surface）                  |
| `pointerEvents: none` | 不写入 pick，留 0 像素（事件自然穿透到下层）                 |
| 旧 `hitTestAt`        | 保留为 `hitResolver === null` 时的兜底（测试环境、初始化前） |

---

## 架构

```
canvas-stage-pointer（DOM 事件层）
        │  stageX, stageY
        ▼
SceneRuntime.dispatchPointerLike
        │  优先调用 hitResolver(x, y)，null 时回退 hitTestAt
        ▼
PickBuffer  (packages/core-v2/src/hit/pick-buffer.ts)
  ├─ pickSurface: SkSurface（CanvasKit MakeSurface）
  ├─ pickIdMap: Map<number, string>   // pickId → nodeId
  ├─ nodeIdMap: Map<string, number>   // nodeId → pickId
  ├─ rebuildAfterLayout(commit, ck, bw, bh, rootScale)
  │     └─ 重画 pick pass（id 色块）
  └─ hitAt(stageX, stageY, rootScale) → string | null
        └─ readPixels → RGBA → pickId → nodeId

后续事件派发 / cursor 解析不变
```

### 接入点

`attachSceneSkiaPresenter`（渲染层）负责：

1. CanvasKit 初始化完成后创建 `PickBuffer`
2. 调用 `runtime.setHitResolver((x, y) => pickBuffer.hitAt(x, y, rootScale))`
3. `subscribeAfterLayout` 回调内先调 `pickBuffer.rebuildAfterLayout(...)`，再调现有 `schedulePaint()`
4. 卸载时调 `runtime.setHitResolver(null)` 并 `pickSurface.delete()`

---

## PickBuffer 详细设计

### pickId 编码

- pickId 为整数，范围 **1 … 16,777,215**（24 位 RGB），0 表示空白
- 颜色编码（RGBA，A 固定 255）：

  ```
  R = (pickId >> 16) & 0xFF
  G = (pickId >>  8) & 0xFF
  B =  pickId        & 0xFF
  A = 255
  ```

- 反查：`readPixels` 取 4 字节 → `pickId = (R << 16) | (G << 8) | B`

### pickId 生命周期

- 每次 `rebuildAfterLayout` 时**全量重建** `pickIdMap` / `nodeIdMap`，从 1 重新分配
- 分配顺序：DFS 遍历场景树（与主帧绘制顺序一致）
- `pointerEvents: "none"` 节点及其整棵子树：跳过，不分配 id，不画
- id 不需要跨帧稳定，读完即用

### pick pass 绘制规则

| 情况                         | 处理                                                              |
| ---------------------------- | ----------------------------------------------------------------- |
| `pointerEvents: "none"`      | 跳过整棵子树                                                      |
| `scrollView`                 | 与主帧一致：先 clip 视口盒，再 `translate(0, -scrollY)`，递归子树 |
| `overflow: hidden`           | `clipRect` / `clipRRect`（与主帧一致）                            |
| 圆角 `borderRadiusRx/Ry`     | 用 `drawRRect` 画 id 色，**关闭抗锯齿**                           |
| `opacity`                    | 忽略（统一不透明，避免边缘混色）                                  |
| `text` / `image` / `svgPath` | 画节点完整布局盒（矩形或圆角矩形），不画字形/图片细节             |
| 叠盖顺序                     | 与主帧一致：后绘的兄弟覆盖先绘，DFS 前序                          |

### hitAt 流程

```
1. 逻辑坐标 → backing store 像素坐标
   px = Math.floor(stageX * rootScale)
   py = Math.floor(stageY * rootScale)

2. pickSurface.readPixels(pixelBuffer, { x: px, y: py, w: 1, h: 1 })

3. pickId = (R << 16) | (G << 8) | B
   if pickId === 0 → return null

4. return pickIdMap.get(pickId) ?? null
```

---

## SceneRuntime 接口变更

```ts
// 新增方法
setHitResolver(fn: ((x: number, y: number) => string | null) | null): void;
```

- `dispatchPointerPipeline` 内部：
  ```ts
  const nextLeaf = hitResolver ? hitResolver(ev.x, ev.y) : hitTestAt(ev.x, ev.y, rootId, store);
  ```
- `hitResolver` 初始值为 `null`（`attachSceneSkiaPresenter` 完成前走兜底）

---

## 生命周期时序

```
attachSceneSkiaPresenter(runtime, canvas, options)
  └─ await initCanvasKit()
  └─ 创建主 skSurface
  └─ 创建 pickSurface = ck.MakeSurface(bw, bh)
  └─ 创建 PickBuffer 实例
  └─ runtime.setHitResolver(...)        ← pick 开始生效
  └─ subscribeAfterLayout(payload => {
       pickBuffer.rebuildAfterLayout(payload, ck, bw, bh, rootScale)
       schedulePaint()                   ← 主帧调度不变
     })

detach()
  └─ runtime.setHitResolver(null)       ← 回退 CPU 命中
  └─ pickSurface.delete()
  └─ unsubLayout()
  └─ cancelAnimationFrame(rafId)
```

---

## 文件变更范围

### 新增

| 文件                                      | 职责                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| `packages/core-v2/src/hit/pick-buffer.ts` | `PickBuffer` 类：pickId 分配、pick pass 绘制、`hitAt` 读像素 |

### 修改

| 文件                                                  | 改动                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/core-v2/src/runtime/scene-runtime.ts`       | 增加 `setHitResolver`；`dispatchPointerPipeline` 优先走 resolver                          |
| `packages/core-v2/src/render/scene-skia-presenter.ts` | 创建 `PickBuffer`、`subscribeAfterLayout` 里调 `rebuildAfterLayout`、注入 / 卸载 resolver |
| `packages/core-v2/src/index.ts`                       | 视情况导出新类型                                                                          |

### 不改

- `packages/core-v2/src/hit/hit-test.ts`（保留为兜底）
- `packages/core-v2/src/input/canvas-stage-pointer.ts`
- `packages/react-v2/`（React 层完全不动）

---

## 测试策略

### 单元测试（无 DOM / 无真实 CanvasKit）

- pickId 编码 / 解码的正确性（纯数学）
- `pointerEvents: none` 节点不写入 `pickIdMap`
- `rebuildAfterLayout` 后 `pickIdMap` 的节点覆盖是否符合预期

### 集成测试

- 使用 `MakeSWCanvasSurface` 在 Node 环境跑：布局提交 → `rebuildAfterLayout` → `hitAt` 返回正确 nodeId
- 覆盖：普通 View、scrollView（带 scrollY）、overflow:hidden + 圆角、pointerEvents:none 穿透

### 回归

- 现有 `scene-runtime-cursor.test.ts`、`hit-pointer-events.test.ts` 在 `hitResolver = null`（兜底路径）下必须仍通过

---

## 不在本次范围内

- 文字选择 / caret 定位（需要 Paragraph API，独立设计）
- pick 纹理降分辨率优化
- 非矩形 / SvgPath 字形级命中（当前 pick 仍画布局盒）
