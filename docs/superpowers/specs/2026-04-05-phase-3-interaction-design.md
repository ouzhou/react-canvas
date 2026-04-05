# 阶段三（M3）交互能力 — 设计规格

**日期：** 2026-04-05  
**状态：** 草案；与 [development-roadmap.md](../../development-roadmap.md) 阶段三（Step 6，Step 7 可选）及对话结论一致。  
**范围：** M3「点得到」：DOM 指针 → 逻辑坐标 → 场景树命中 → 捕获/冒泡 → 合成事件与 **`onClick`**；**`View` / `Text`** 为命中宿主；hover / pressed 为**状态驱动样式**，无 CSS `:hover`。**不含** ScrollView / `wheel` 语义定型（阶段四）、**不含**可选 `Pressable` 封装之必达交付（可后续迭代）。

---

## 1. 文档落点

| 方案                                | 说明                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **A. 本文件为阶段三主规格（采用）** | 记录可执行边界与模块职责；与 roadmap、`hostconfig-guide`、`runtime-structure-constraints` 交叉引用。 |
| B. 仅写 roadmap                     | 不足以承载坐标系、传播顺序与验收细节。                                                               |

---

## 2. 目标与非目标

### 2.1 目标

- 用户在 **单个 `<canvas>`** 上与内容交互：至少支持 **`onClick`**（合成「一次激活」）及低级 **`onPointerDown` / `onPointerUp` / `onPointerMove`**（名称对齐 DOM Pointer Events 习惯）。
- **命中**：基于 **Yoga 已同步的布局框**（`layout.left/top/width/height` 及场景树累计偏移）对 **`ViewNode` 与 `TextNode`** 做轴对齐包围盒判断；**Text v1 为整段文本框**，不做 glyph 级命中。
- **传播**：**捕获（根 → 叶）** 与 **冒泡（叶 → 根）** 两阶段；支持 **`stopPropagation()`** 阻断后续监听。
- **悬停与按压**：通过 **`pointermove` + 命中变化** 维护 **`hovered` 宿主链**（或等价信息）；通过 **down/up 与命中** 维护 **`pressed`**；**不**引入浏览器式 CSS 选择器或 `:hover` 引擎。

### 2.2 非目标（本阶段不承诺）

- **无障碍 / 键盘**：`click` 的键盘激活、焦点环、ARIA（阶段六）。
- **`wheel` 与滚动**：与 **ScrollView** 绑定的滚轮语义在 **阶段四** 单独收敛；本阶段可在 **document 或 canvas** 上监听 `wheel` 仅作透传/占位，**不**作为 M3 验收项。
- **`Pressable` 组件**：见 roadmap Step 7，**可选**；M3 完成条件 **不依赖** 该组件。
- **glyph / 行内矩形命中**：Text 内链接级命中可后续专页讨论。
- **`onPress` 命名**：对外主叙事为 **`onClick`**；与 RN `onPress` 的对照写在用户文档即可。

---

## 3. 已确认决策摘要

| #   | 主题             | 决议                                                                                                                       |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | **对外主 API**   | **`onClick`** 为合成激活；低级 **`onPointer*`** 保留。                                                                     |
| 2   | **命中宿主**     | **`View` 与 `Text`**；Text 首版 **整框命中**。                                                                             |
| 3   | **hover / 样式** | **无 CSS `:hover`**；用 **状态 + `style`**（或后续 className 构建管线，阶段六可选）。                                      |
| 4   | **Pressable**    | **非必达**；用户可用状态 + `View`/`Text` 自写按钮。                                                                        |
| 5   | **与 RN 关系**   | 传播两阶段、包围盒命中与 roadmap [技术调研](../../technical-research.md) §六一致；API 命名优先 **Web 习惯**（`onClick`）。 |

---

## 4. 架构与模块边界

### 4.1 分层

| 层级               | 职责                                                                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DOM 适配**       | 在 **`<Canvas>` 持有的 `<canvas>`** 上注册 `pointer*`（及必要的 `lostpointercapture` 等）；可选在 **window/document** 监听 `pointermove`/`pointerup` 以处理 **拖出画布仍按住** 的场景。                                                |
| **坐标系**         | 将 `clientX/clientY` 转为 **Canvas 逻辑坐标**（与绘制/layout 使用的坐标系一致）：考虑 **元素相对视口偏移**、**CSS 尺寸与 `width`/`height` props**、**`devicePixelRatio`**（命中用逻辑像素，与 `ViewNode.layout` 一致）。               |
| **命中检测**       | 自根 `sceneRoot` 起，对子树 **深度优先** 或 **逆序绘制顺序**（后绘在上）确定 **最前命中叶**；再向上构建 **从叶到根的路径** 用于冒泡。具体 **z-index** 若无样式支持，**v1 以子树遍历顺序 + 兄弟顺序** 为准，与绘制顺序对齐（见 §5.2）。 |
| **传播与分发**     | 对单条路径执行 **捕获** 再 **冒泡**；监听器从 **场景节点挂载的回调** 读取（见 §6）。                                                                                                                                                   |
| **合成 `onClick`** | 在 **同一 pointer id** 上，于 `pointerup`（或 `pointercancel`）时若满足 **激活阈值**（§7），对 **pointerdown 时命中的最深宿主**（或 up 时仍在其框内，二选一须实现一致）触发 **`onClick` 一次**。                                       |

### 4.2 包边界

- **`@react-canvas/core`**：命中遍历依赖的 **场景树与 `layout` 只读访问**、（可选）**纯函数** `hitTest` / `dispatchEvent`；**不依赖 React**。
- **`@react-canvas/react`**：在 **`Canvas`** 或紧邻模块中 **绑定 DOM**；**HostConfig** 在 **commit** 路径把 `onClick` / `onPointer*` 写入节点或注册表；**禁止在 render 中改场景树**（与 [hostconfig-guide.md](../../hostconfig-guide.md) 一致）。

---

## 5. 命中检测

### 5.1 包围盒与坐标

- 每个 **`ViewNode` / `TextNode`** 在 **其父坐标系**下有 `layout`；命中检测使用 **轴对齐矩形**，**暂不考虑 `borderRadius` 做几何裁剪**（点击圆角外透明区仍算命中，与多数 RN/Web 简化实现一致，可在文档注明）。
- **累计变换**：子节点 **画布/根逻辑坐标** = 祖先 `layout.left/top` 链式相加（与 `paint` 一致）；实现上宜 **复用或与绘制共享**「世界坐标」计算，避免漂移。

### 5.2 多子重叠

- **同一父节点**内：**后声明 / 后绘制** 的子节点优先（与绘制顺序一致，需与 `paintScene` 遍历顺序 **明确对齐**）。
- **跨分支**：以 **深度优先 + 兄弟顺序** 规则确定 **最顶命中**；若未来引入 `zIndex`，再扩展排序键。

### 5.3 不可见节点

- **`display: 'none'`** 的节点 **不参与** 命中（与不参与布局/绘制一致）。
- **`opacity: 0`**：v1 **仍参与命中**（与 RN 常见行为可议）；若实现简单，可在规格中改为「不参与」——**本文采用：参与命中**，文档说明。

### 5.4 `pointerEvents`（可选扩展）

- v1 **可不实现**；若实现，建议对齐 RN：**`none` / `box-none` / `box-only` / `auto`** 子集，且在 **命中阶段**过滤。

---

## 6. 事件对象与 props

### 6.1 合成事件（建议字段）

| 字段              | 含义                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| `type`            | `'pointerdown'` / `'pointerup'` / `'pointermove'` / `'click'`（若单独派发）等 |
| `pointerId`       | 对齐 DOM PointerEvent                                                         |
| `locationX/Y`     | 相对 **当前目标节点** 左上角                                                  |
| `pageX/Y`         | 相对 **Canvas 逻辑坐标系原点**（或根 View）                                   |
| `target`          | 指向场景节点或稳定句柄（实现选其一并文档化）                                  |
| `currentTarget`   | 传播过程中当前层级                                                            |
| `stopPropagation` | 函数；调用后 **同阶段后续节点** 不再执行                                      |
| `preventDefault`  | 可对 `wheel` 等预留；指针默认无浏览器默认行为                                 |

**时间戳**：可提供 `timestamp`（来自 `event.timeStamp`）。

### 6.2 宿主 props

- **`View` / `Text`**：`onPointerDown?`、`onPointerUp?`、`onPointerMove?`、`onClick?`；类型为 **`(event: CanvasPointerEvent) => void`**（名称可最终导出为 `SyntheticPointerEvent` 等）。
- **回调存储**：挂在 **场景节点** 或 **并行 WeakMap**；**commitUpdate** 时更新，与样式更新同一事务认知。

---

## 7. `onClick` 激活规则（v1 缺省）

以下缺省值可调整，但 **须在实现与文档中写死一处**：

| 规则       | 建议缺省                                                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 起止       | 同一 `pointerId` 上 **`pointerdown`** 后 **`pointerup`**（或 `pointercancel` 则不算 click）。                                             |
| 移动阈值   | down 与 up 之间 **位移 < 10（逻辑 px）**（或相对对角线比例），超出则 **不触发 `onClick`**。                                               |
| 时间阈值   | 可选：过长视为长按另议；v1 **可不限制时间**，长按不触发 `onClick`（若实现长按检测则另派发）。                                             |
| 目标一致性 | **推荐**：`onClick` 的 target 为 **pointerdown 时命中的最深节点**；若 up 时移出该节点框外，**是否仍触发** —— **推荐：不触发**（防误触）。 |

---

## 8. Hover 与 pressed

- **Hover**：在 **`pointermove`**（含 canvas 外通过 document 捕获）时更新 **当前逻辑坐标下的命中路径**；与上一帧比较，对 **进入/离开** 的节点触发 **`onPointerEnter` / `onPointerLeave`**（若本阶段实现）或仅 **内部更新 hover 状态供可选 Hook 使用**。
- **Pressed**：**`pointerdown`** 在节点上 → `pressed` true；**`pointerup` / `pointercancel` / lost capture** → 清除。
- **重绘**：若样式随 hover/pressed 变化，须走 **React setState** 或 **节点标记 dirty + 与 reconciler 协调**；**禁止**在指针回调里直接改场景树而不触发更新（除非明确走 imperative 路径并文档为高级用法）。

---

## 9. 错误处理与并发

- **布局未就绪**：若某一帧 `layout` 尚未计算，**跳过命中**或 **使用上一帧 layout**（二选一，推荐 **不派发** 点击以避免野指针）。
- **多指**：以 `pointerId` **隔离**状态机；每个 pointer 独立一条「按下目标 / 拖拽距离」记录。

---

## 10. 测试与验收

- **单元测试（core）**：给定静态树与 `layout` 矩形，**hitTest(x,y)** 返回路径与顺序；**stopPropagation** 行为。
- **单元测试（react）**：挂载带 `onClick` 的 `View`，**模拟 pointer 序列**（可用测试工具发事件到 canvas），断言 **调用次数与坐标**。
- **不将像素截图**列为 M3 CI 必达；网站 playground 可作为人工验收。

**验收代码（与 roadmap 一致）：**

```tsx
<View
  style={{ width: 100, height: 100, backgroundColor: "blue" }}
  onClick={() => console.log("clicked")}
/>
```

---

## 11. 运行时结构约束（新增建议）

| 规则 ID   | 建议                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| R-EVENT-1 | 仅在 **`Canvas` 已挂载且 runtime 就绪** 时注册 DOM 监听；卸载时 **移除监听**，避免泄漏。                            |
| R-EVENT-2 | 事件回调 **不得在 HostConfig 之外** 同步修改 Yoga 树结构；样式更新须经 **props/commit** 或文档化的 imperative API。 |

完整 ID 登记见 [runtime-structure-constraints.md](../../runtime-structure-constraints.md)（后续可并入正文）。

---

## 12. 相关文档

- [development-roadmap.md](../../development-roadmap.md)（阶段三）
- [hostconfig-guide.md](../../hostconfig-guide.md)
- [runtime-structure-constraints.md](../../runtime-structure-constraints.md)
- [phase-1-design.md](../../phase-1-design.md)
- [technical-research.md](../../technical-research.md)（命中与传播）

---

## 13. 下一步

经你审阅本规格无误后，使用 **writing-plans** 产出阶段三（Step 6，可选 Step 7）可执行任务清单；实现细节（文件名、具体 API 导出命名）在计划中展开。
