# Pointer move、上一目标、合成 enter/leave（A）与 View 的 `style({ hovered })`

日期：2026-04-11  
范围：`@react-canvas/core-v2` 指针管线、`@react-canvas/react-v2` 的 `View`。

---

## 1. 目标

1. 支持 **`pointermove`**，并与现有 **`pointerdown` / `pointerup` / `click`** 一样使用 Stage 坐标与命中测试。
2. **内部**维护 **`lastHitTargetId`**（上一帧命中的**叶子**）；在 move 导致命中叶子变化时，对 **仅涉及的旧叶、新叶** 合成 **`pointerleave`**（旧）与 **`pointerenter`**（新）——**方案 A**，不对整条根→叶路径做 DOM 式逐节点 enter/leave。**不**对外暴露 `hoverTargetId` / `getHoverTargetId` 等 API（需求面窄；需要全局状态时可用事件或后续再议）。
3. **`react-v2` `View`**：支持 **`style` 为函数** `({ hovered }: { hovered: boolean }) => ViewStyle`，本期 **仅 `hovered`**；静态对象 `style` 行为不变。

非目标（功能 · 本期）：`pressed`、多指完整模型、`pointercancel`（可与离开画布收尾一起做）。

---

## 1.1 性能（强制）：与功能同期交付，不后置

**原则**：**move / hover 路径必须可高频运行**；凡会导致 **每事件全量 `Yoga#calculateLayout`** 的实现，**不符合**本 spec。性能相关条目与 `pointermove` / enter / leave **同一批验收**，**不得**单列「后续再做」。

**瓶颈**：`calculateAndSyncLayout`（全树 Yoga + 同步 `layout`）成本远高于 **`hitTestAt`**；若仅指针移动也每次跑 Yoga，无法接受。

### 1.1.1 **必须实现**（同一实现周期内全部完成并验收）

| 项                                 | 内容                                                                                                                                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`layoutDirty`（必选）**          | **置脏**：`insertView`、`removeView`、`updateStyle`、**视口尺寸变化**（等一切会改变 Yoga 树或样式、进而影响布局结果的操作）。**清脏**：在一次 **`calculateAndSyncLayout` 成功执行完毕**后置为「干净」。**首次**派发指针前或 runtime 初始化后须保证至少有一次有效布局（或初始为脏）。 |
| **派发时跳过 Yoga**                | **`dispatchPointerLike`**（及与 move 合并后的同一命中入口）：**若布局干净**（`!layoutDirty`），**不得**调用 `calculateAndSyncLayout`，**直接**使用已缓存的 `node.layout` 做 **`hitTestAt`**。**若脏**，先 `calculateAndSyncLayout` 再命中，再清脏。                                  |
| **rAF 合并 `pointermove`**         | 同一帧内多次 `pointermove` → **至多一次**命中与派发管线；坐标可取该帧 **最后一次** move。                                                                                                                                                                                            |
| **`prevLeaf === nextLeaf` 短路**   | 命中叶子未变 → **不**派发 `pointerenter` / `pointerleave`（`pointermove` 是否派发见 2.3，可与监听存在性一并约定）。                                                                                                                                                                  |
| **react-v2 函数 `style`（见 §4）** | **主路径**：仅在 **`pointerenter` / `pointerleave` 导致 `hovered` 变化** 时合并并 `updateStyle`——**不**依赖对解析结果做 `JSON.stringify` 作为主要手段。                                                                                                                              |

### 1.1.2 **本 spec 不纳入**（与「必做」无关的远期项）

| 项                                              | 说明                      |
| ----------------------------------------------- | ------------------------- |
| **空间索引 / 粗筛**                             | 节点极多时再专项。        |
| **`pointermove` 取消 capture/bubble、仅发叶子** | 属派发模型变更，另 spec。 |

### 1.1.3 测试建议（性能相关）

- **断言**：连续 **仅 `pointermove`**（树与样式不变）时，**`calculateAndSyncLayout` / `calculateLayout` 调用次数**不随 move 次数线性增长（例如第一次或置脏后一次，之后 0 次直至再次置脏）。
- **rAF**：同一帧内多次 move 仅触发 **一次**命中管线。

**结论**：**`layoutDirty` + 干净路径零 Yoga** 与 **rAF + 叶子 diff 短路** 与 **§4 的 `style` 更新策略** 一并交付；**不**允许「先上 move 再补 layoutDirty」。

---

## 2. 语义约定

### 2.1 `pointerenter` / `pointerleave`（A）

- 仅当 **`prevLeafId !== nextLeafId`** 时（且二者可为 `null` 表示指针不在任何可命中节点上）：
  - 若 `prevLeafId !== null`：对该 id **派发 `pointerleave`**（事件对象携带 `targetId` = 该节点，`type` = `pointerleave`）。
  - 若 `nextLeafId !== null`：对该 id **派发 `pointerenter`**。
- **不**沿祖先链为每个中间节点派发 enter/leave。
- **与 DOM**：原生 `mouseenter`/`mouseleave` 为按元素边界、且不冒泡；本设计为 **画布命中叶子 + 引擎内可与其它类型共用 capture/bubble 管线**（见 3.2），文档中注明 **不等价于 DOM**。

### 2.2 内部状态（不对外暴露）

- 实现用 **上一帧叶子 id** 与 **本帧命中叶子 id**（可为 `null`）做 diff；**不**提供公开 getter 与「当前 hover 目标 id」订阅。
- **离开画布**：在 `pointerup` / `pointerleave`（canvas）/ `pointercancel` 等收尾点将内部 **`lastHitTargetId` 清空**并必要时对 **旧叶** 补 `pointerleave`（与「从有目标到无目标」一致）。

### 2.3 `pointermove`

- 每帧（或每次 rAF 合并后）对 **当前命中叶子** 派发 **`pointermove`**（若无叶子则不派发或派发规则在实现中二选一并写入 README）。

---

## 3. 架构

### 3.1 类型与事件对象

- 扩展 **`PointerEventType`**：`pointermove` | `pointerenter` | `pointerleave`。
- **`ScenePointerEvent`**：沿用现有字段；`targetId` 为事件语义上的目标（enter/leave/move 均为当前讨论节点）。

### 3.2 派发路径

- **`dispatchPointerLike`**：**若 `layoutDirty` 则** `calculateAndSyncLayout` 并清脏；**若干净则跳过 Yoga**，仅用当前 `node.layout` **→ `hitTestAt` → 捕获 / 冒泡**（详见 **§1.1**）。
- **enter/leave**：仅 **目标 id 一条路径**（根→该叶）参与 capture/bubble，与 `pointerdown` 一致；**不在路径上额外为「仅因祖先关系」的节点发 enter/leave**（A 的核心）。

### 3.3 画布输入层

- **`attachCanvasStagePointer`**：增加 **`pointermove`**（建议 **`{ passive: true }`** 若适用）。
- **rAF 合并**：同一帧内多次 move **合并为一次**「命中 + diff + 派发 move + 必要时 enter/leave」。
- **`lastHitTargetId`** 仅 **runtime 内部**使用，**不**对外暴露；**不**要求用户手动初始化。

### 3.4 性能

- 全部以 **§1.1** 为准；**`layoutDirty` 为零 Yoga 命中路径之前不得宣称本 spec 完成**。

---

## 4. `react-v2`：`View` 与 `style({ hovered })`

- **`style` 类型**：`ViewStyle | ((state: { hovered: boolean }) => ViewStyle)`。
- **行为**：
  - 静态：与现有一致（`insertView` / `updateStyle`）。
  - 函数：**`hovered` 仅由 `pointerenter` / `pointerleave`（或内部等价订阅）驱动**；仅在 **`hovered` 变化**后重新执行 `style` 得到 **`resolvedStyle`**，再 **`updateStyle(nodeId, resolved)`**。主矛盾是 **React**：若父组件**每次渲染**传入**新的** `style` 函数引用，会无谓触发 `useLayoutEffect` / 依赖 `style` 的同步逻辑——**应在调用侧用 `useCallback` 稳定函数**或抽出模块级常量，**而不是**把 **`JSON.stringify` 比较解析结果**当作主修复（易碎、键序敏感、掩盖引用问题）。
- **首期** state 参数 **仅 `{ hovered }`**；`pressed` 后续再接。

---

## 5. 测试

- **core-v2**：`hitTestAt` + `pointerEvents` 与 move；`prev`→`next` 时 **仅两叶** leave/enter；**§1.1.3** 性能断言；rAF 合并；可选 `getLastDispatchTrace`。
- **react-v2**：函数 `style` 在 hovered 切换时 **背景等样式** 更新（可快照布局或 mock runtime）。

---

## 6. 文档

- 更新 **`packages/core-v2/README.md`**：事件类型、A 语义、与 DOM 差异；**不**文档化公开 hover id getter。
- **`packages/react-v2/README.md`**：函数 `style` 与 `hovered`。

---

## 7. 自检

- 范围：move + 上一目标 + A enter/leave + `style({ hovered })`。
- 性能：**§1.1.1 全条**（含 **`layoutDirty` + 干净路径不跑 Yoga**）与 **§1.1.3** 可测；**§1.1.2** 为明确不纳入项。
- 与 DOM 的差异已写明。
