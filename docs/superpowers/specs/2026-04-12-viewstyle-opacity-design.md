# ViewStyle `opacity`（CSS 组透明）设计

**日期**：2026-04-12  
**状态**：待你确认后进入 implementation plan  
**范围**：`packages/core-v2`（`ViewStyle`、`LayoutSnapshot`、`attachSceneSkiaPresenter`）；`packages/react-v2` 类型透传；可选 `apps/v2` smoke。

## 1. 目标与非目标

### 1.1 目标

- 支持 **`ViewStyle.opacity`**，语义对齐 **CSS / RN：`opacity` 作用于该节点及其整棵子树**（组透明）。
- 实现取向 **B**：当某节点 **`opacity < 1`** 时，将该节点 **自身绘制内容（背景等）与子树** 先画入 **离屏层**，再按该节点的 alpha **合成到父表面**；祖先链上若有多层 `< 1` 的 `opacity`，则 **嵌套多层**离屏（等价于包含祖先效应，**不显式维护一条「全局累积 alpha 乘积」链**去乘到每个 `Paint` 上——避免与 CSS 在「子节点自身也有 `opacity`」等场景下不一致）。

### 1.2 非目标（首版）

- **`mix-blend-mode`** 及其他合成模式。
- **不因 `opacity` 改变命中区域**（与常见 Web/RN 一致；`opacity: 0` 仍默认可命中，除非另有 `pointer-events: none` 等）。
- **不把 `opacity` 传给 Yoga**（不参与 flex 测量；若日后与布局耦合另开 spec）。
- **性能极致优化**（层合并、脏矩形、缓存）留待后续迭代，本 spec 以 **语义正确** 为先。

## 2. API 与取值

- **`ViewStyle.opacity?: number`**：建议 **0～1**（与 RN / CSS 小数习惯一致）。
- **缺省**：未设置或视为 **`1`**（完全不透明）。
- **规范化**：在 **写入快照** 或 **presenter 消费** 时 **clamp 到 `[0, 1]`**；`NaN` / 非法值视为 **`1`**（spec 写死一处，避免双实现分歧）。

## 3. 数据流（推荐方案：opacity 进 `LayoutSnapshot`）

### 3.1 为何不把 presenter 绑回 `NodeStore`

采用 **`LayoutCommitPayload.layout` 自包含**：每个节点 entry 携带绘制所需 `opacity`，`attachSceneSkiaPresenter` **仅依赖 payload**，便于测试与调试层消费，避免与 runtime 内部结构耦合。

### 3.2 `LayoutSnapshot` 扩展

在每个布局条目中增加可选字段，例如：

```ts
opacity?: number; // 规范化后；省略表示 1 或由读取方默认 1
```

由 `buildLayoutSnapshotWithoutRun` 从 `SceneNode.viewStyle?.opacity` 写入（经 clamp）。**`opacity === 1` 可省略字段**以控制快照体积（presenter 缺省按 `1`）。

### 3.3 Yoga / `clearYogaLayoutStyle`

**不**增加 Yoga 字段；`clearYogaLayoutStyle` / `applyStylesToYoga` **不处理** `opacity`。

## 4. Skia 绘制（`scene-skia-presenter.ts`）

### 4.1 `paintSubtree(id)` 顺序（与现有一致处）

保持 **先画本节点**（背景矩形、文本等），再 **按子节点顺序递归**（与当前 DFS 一致）。

### 4.2 组透明

令 `a = clampOpacity(box.opacity)`。

- 若 **`a < 1`**：
  1. `skCanvas.save()`。
  2. 使用 CanvasKit 支持的 **`saveLayer`**（或等价 API）以该节点 **布局盒**（`absLeft`, `absTop`, `width`, `height`）为边界建立离屏，**将该层合成 alpha 设为 `a`**（具体 API 以 `canvaskit-wasm` 类型为准）。
  3. 在本层内执行现有「画本节点 + 递归子节点」逻辑。
  4. `skCanvas.restore()`（或配对 API）。
- 若 **`a === 1`**：不建立额外层，行为与今一致。

### 4.3 与后续能力叠放顺序（圆角 / `overflow: hidden`）

首版实现 **仅 opacity**。与未来的 **`clipRect` / `clipRRect`（overflow、圆角）** 叠放时，须在 **implementation plan** 里写死顺序（例如 **先 clip 再 opacity 层** 或相反），并在该 spec 中 **交叉引用** 更新，避免同一节点上语义打架。本 spec **不**抢先实现 clip。

## 5. 测试建议

- **`scene-runtime`**：给定 `viewStyle: { opacity: 0.5 }`，断言 `LayoutSnapshot` 对应 entry **含 `opacity: 0.5`**（或省略 `1` 的策略与断言一致）。
- **边界**：`opacity: 0` 仍布局存在；快照或 presenter 不崩溃；子树仍可递归绘制（视觉上全透明）。
- **Presenter**：若项目内已有对 CanvasKit 的轻量 mock，可对「`opacity < 1` 时 `save`/`saveLayer`/`restore` 调用次数」做弱断言；否则以 **v2 smoke 人工验收** 为主，并在 plan 中列手动步骤。

## 6. 对外类型与包边界

- `packages/core-v2/src/layout/style-map.ts`：`ViewStyle` 增加 `opacity`。
- `packages/core-v2/src/index.ts`：若仅扩展 `ViewStyle` 且无新导出类型，可不动。
- `packages/react-v2`：`ViewStyle` 来自 core，**一般无需改实现**。
- **`apps/v2`**：可选在 `demo=style` 增加嵌套半透明块，便于肉眼回归。

## 7. 自检

- [ ] 语义为 **B（saveLayer 嵌套）**，非「仅把祖先 alpha 乘到叶子 Paint」。
- [ ] 命中行为首版 **不变**。
- [ ] `opacity` **不进 Yoga**。
- [ ] 与 **overflow / 圆角** 的叠放留待后续 plan 显式约定。

## 8. 后续

你确认本 spec 无修改后，使用 **writing-plans** 编写实现计划（含 CanvasKit `saveLayer` 具体签名查证、`paintSubtree` 伪代码、文件列表与验收步骤）。
