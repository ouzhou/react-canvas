# ScrollView（画布内）— core-v2 + react-v2 设计规格

**日期：** 2026-04-12  
**状态：** 待审阅（实现前门禁）  
**继承：** 与 [阶段四 Step 9 — ScrollView 草案](../archive/superpowers/specs/2026-04-06-step-9-scrollview-design.md) 的 **V1 范围与架构取向** 一致；本文将文件路径与类型落点 **对齐到当前 monorepo 的 `packages/core-v2` 与 `packages/react-v2`**。  
**非目标：** 本文不写具体 patch 清单；实现计划由 **writing-plans** 在规格通过后产出。

**已确认（2026-04-12）：滚轮策略 B** — V1 在 `wheel` 上 **不调用 `preventDefault`**：仅根据 Stage 命中与 delta 更新 `scrollY` 并重绘；**接受**与浏览器/页面默认滚动 **可能同时发生**（双滚）。后续若需消除双滚，可升级为策略 A（可滚时 `preventDefault`，且需 `passive: false`）。

---

## 1. 目标与非目标

### 1.1 目标（V1）

- 在 **固定视口**（布局盒由 Yoga 与 `ViewStyle` 决定，常见为 `flex: 1` + `minHeight: 0`）内展示 **可纵向超出** 的子内容；用户通过 **指针拖拽** 与 **滚轮** 改变可见区域。
- **core-v2**
  - 场景树中存在 **可识别的滚动容器语义**（见 §3），维护 **`scrollY`（V1 主路径）**；可选保留 `scrollX` 字段但 **V1 行为可为恒 0**（须在 API 文档标明）。
  - **绘制**：在现有 `overflow: hidden | scroll` 的 **裁剪**（`scene-skia-presenter.ts` 中 `clipRect` / `clipRRect`）之内，对 **内容子树** 施加 **`translate(0, -scrollY)`**（与 Stage 坐标系一致；若实现顺序为先 clip 再 translate，须在实现计划中写死顺序，避免与组透明 `saveLayer` 冲突）。
  - **命中**：`hit-test.ts` 在遍历到滚动容器时，将 Stage 坐标 **逆变换** 为内容坐标后再测子树；**不可见区域**（被裁切部分）不参与命中。
  - **边界**：由布局得到 **视口高度 `viewportH`** 与 **内容高度 `contentH`**（定义见 §4），`maxScrollY = max(0, contentH - viewportH)`；布局变更或子树高度变化时 **钳制** `scrollY`。
- **react-v2**
  - 导出 **`<ScrollView>`**（或最终命名），子节点挂载在 **内容根** 下；与现有 `View` / `Text` 相同 **scene id + `useLayoutEffect`** 模式，但注册到 runtime 的 **专用 API**（见 §3），避免与普通 `insertView` 混淆。
- **输入**
  - **`packages/core-v2/src/input/canvas-stage-pointer.ts`**：增加 **`wheel`** 监听；**`passive: true` 即可**（与策略 B 一致，不在此拦截默认滚动）。坐标经 `clientXYToStageLocal` 后进入 runtime，由 runtime 更新 `scrollY` 并重绘。
  - **拖拽滚动**：在滚动视口内 `pointerdown` 后，根据 `pointermove` 的 **delta** 更新 `scrollY`（V1 可不区分触摸/鼠标，统一按位移）；`pointerleave` 画布时行为与现有一致（不强制结束拖拽，简化 V1；若实现中发现需 `setPointerCapture` 与滚动冲突，在计划中单列）。

### 1.2 非目标（V1 不验收）

- **惯性**、**回弹**、**滚动条 UI**。
- **嵌套滚动**（子树内再套 `ScrollView`）：**不支持**；行为 **未定义**。
- **`onScroll` 回调**：可选；不纳入 V1 必达。
- **`Animated` / `contentOffset` 动画联动**：不纳入 V1。

---

## 2. 方案对比与决议（与 Step 9 草案一致）

| 方案                        | 说明                                                                                       | 结论              |
| --------------------------- | ------------------------------------------------------------------------------------------ | ----------------- |
| **A. 专用滚动容器节点**     | `SceneNode` 扩展 `kind: "scrollView"`（或等价），`scrollY` 存节点上；paint / hit-test 分支 | **采用**          |
| B. 堆在普通 `View` 上       | `View` + 魔法 style                                                                        | 职责膨胀          |
| C. 双 `View` + 仅 transform | 偏移不进统一场景语义                                                                       | 命中/滚轮边界易错 |

---

## 3. core-v2 架构要点

### 3.1 节点与数据

- **`SceneNodeKind`** 扩展为包含 **`"scrollView"`**（命名以代码为准，须与 `view` / `text` 并列导出类型）。
- **`SceneNode`** 增加 **`scrollY: number`**（及预留 **`scrollX?: number`**，V1 可恒为 0）；缺省 **`scrollY === 0`**。
- **Runtime API**（名称示意，实现计划里敲定）：
  - `insertScrollView(parentId, id, style)`：创建 Yoga 节点、登记为 `scrollView`，**第一个子节点**为 **内容根**（与 §4 树约定一致）。
  - `patchScrollOffset(id, deltaOrAbsolute)` 或 `setScrollY(id, y)`：更新偏移、钳制、标记 **仅重绘**（若当前架构无「仅 paint」路径，则 **最小化** 为 `layoutDirty` 的替代方案并在计划中说明权衡）。
- **布局**：滚动容器 **与普通 View 共用** `applyStylesToYoga` / `ViewStyle`；视口建议 **`overflow: "hidden"`**（见 §6）。内容子树高度 **允许大于** 视口高度；Yoga 对溢出子项的布局须 **实测验证**（若 Yoga 裁切影响子高度计算，在计划中采用「内层再包一层测量用 View」等补救）。

### 3.2 命中测试

- **`hit-test.ts`**：`visit` 滚动节点时：
  1. 先用 **视口** `absoluteBoundsFor(scrollViewId)` 判断点是否在视口内；若否，该子树跳过。
  2. 若在视口内，将 `(stageX, stageY)` 转为 **内容坐标** `(stageX, stageY + scrollY)`（或等价，与 paint 的 translate 方向严格互逆）后 **仅对内容子树** 递归。
- **`pointerEvents: "none"`** 语义保持不变。

### 3.3 绘制

- **`scene-skia-presenter.ts`**：在现有 **clip + opacity saveLayer** 顺序下，对 `scrollView` 节点在 **clip 之后**、绘制 **内容子树** 前 **`translate(0, -scrollY)`**（与 hit-test 一致）；**不**对滚动容器自身背景（若有）错误平移（背景仍在视口框内绘制）。

### 3.4 滚轮与重绘

- **`attachCanvasStagePointer`**：`wheel` 监听 → `runtime` 专用入口（如 `dispatchWheelLike`；计划中命名），**不** `preventDefault`（策略 B）。
- Runtime 内根据 Stage 坐标 **命中** 判定是否落在 **可纵向滚动** 的 `ScrollView` 视口内；若是且 `maxScrollY > 0`，按 `deltaY` 更新 `scrollY` 并 **钳制**，然后触发 Skia **重绘**。V1 无嵌套滚动，**至多一个** ScrollView 消费该次 wheel 逻辑即可。

---

## 4. 树与布局约定（V1）

- **单内容根**：`ScrollView` 的 **直接子节点数建议为 1**（一个 `View` 包裹多段 `Text`）；多子节点行为 **未定义** 或按「仅第一子为内容」在计划中写死并加 dev 断言。
- **尺寸来源**
  - **视口**：`ScrollView` 节点 `layout.height` / `width`。
  - **内容高度**：内容根子树 **在 Yoga 中的已布局高度**（取内容根 `layout.height` 或其子树最大延伸，以实测为准，在计划中固定一种定义，避免与 `absoluteBoundsFor` 混淆）。

---

## 5. react-v2 用法（目标 DX）

```tsx
<ScrollView style={{ flex: 1, minHeight: 0 }} overflow="hidden">
  <View style={{ flexDirection: "column" }}>{/* 可变高内容 */}</View>
</ScrollView>
```

- **`ScrollView`** 向 `ParentSceneIdContext` 提供 **内容根 id** 给子 `View`/`Text`（与 `Modal` 分槽模式可类比，但落点在 **scroll 内容槽**）。
- 样式：`ViewStyle` 子集 + 默认 **`overflow: "hidden"`** 于视口（可覆盖为 `hidden` 唯一对外推荐，见 §6）。

---

## 6. 与 `ViewStyle.overflow` 三态的关系（产品说明）

- **Yoga / 内部** 仍可保留 **`visible` | `hidden` | `scroll`** 映射（与 `style-map.ts` 一致），避免与 Yoga 枚举脱节。
- **对应用开发者文档**：**裁切**推荐 **`hidden`**；**可滚区域**必须用 **`ScrollView`**，**不**鼓励「给普通 `View` 写 `overflow: "scroll"` 就当滚动」——与先前讨论一致，避免「有 scroll 却不能滚轮」的误解。

---

## 7. 验收标准（V1）

- 纵向内容高于视口时：**拖拽**与 **滚轮** 均能改变可见内容。**不**验收「阻止整页滚动」：策略 B 下 **允许** 画布与页面 **同时** 响应滚轮（已知取舍）。
- **点击 / hover / cursor**：滚动后命中与视觉一致。
- **边界**：`scrollY` 钳制在 `[0, maxScrollY]`。
- **apps/v3**：`react-smoke` 主栏 **文档区 + 控件 + 舞台** 包入 `ScrollView` 后，切换中英文 **不再依赖整页高度** 才能操作（与 i18n 目标对齐）。

---

## 8. 测试策略

- **core-v2**：小场景构造 `scrollView` + 子矩形，断言 **非零 `scrollY`** 下 **hitTestAt** 与 **布局快照 / 绘制路径**（若已有 snapshot 测试则对齐；否则以 hit-test + 可选 golden 最小集）。
- **react-v2**：`CanvasRuntime` 或现有测试夹具下 **挂载 ScrollView + 可点叶子**，模拟滚动后 **click 仍命中正确 id**。

---

## 9. 与其它文档的关系

- **主来源**：[2026-04-06-step-9-scrollview-design.md](../archive/superpowers/specs/2026-04-06-step-9-scrollview-design.md)（范围与非目标以该文为准，本文仅更新包路径与实现落点）。
- **裁剪与圆角**：[2026-04-12-overflow-border-radius-design.md](./2026-04-12-overflow-border-radius-design.md) — ScrollView 视口绘制顺序须与此一致。
- **指针**：[2026-04-11-pointer-move-hover-design.md](./2026-04-11-pointer-move-hover-design.md) — 拖拽滚动与 hover 刷新在实现计划中交叉检查。

---

## 10. 实现门禁

1. **审阅**：维护者确认 §3–§7 无歧义。
2. **writing-plans**：通过后为 `core-v2` → `react-v2` → `apps/v3` 分 PR 或单 PR 顺序写计划。
3. **禁止**：在规格未获「可开始实现」确认前，合并 ScrollView 实现代码（与 brainstorming HARD-GATE 一致）。
