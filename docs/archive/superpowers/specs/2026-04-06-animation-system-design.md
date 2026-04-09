# 动画系统（阶段六 Step 12）— 设计规格

**日期：** 2026-04-06  
**状态：** 草案；与 [development-roadmap.md](../../development-roadmap.md) 阶段六 Step 12、[技术调研 §12](../../core/technical-research.md#十二动画系统) 及本节对话结论一致。  
**实现策略：** **尽可能完整交付**已共识的 V1 范围——**不**以「长期仅 opacity / 仅占位 API」为可接受终态；**`transform` 动画依赖绘制层对 `transform` 的支持**，应与 **阶段五 Step 10**（或等价实现）**同批次或紧衔接落地**，避免对外 API 与视觉效果长期脱节。

---

## 1. 目标与非目标

### 1.1 目标

- 提供 **与 React Native `Animated` 尽量对齐** 的命名与常见用法（详见 §3），并在文档中列出与本运行时的差异。
- **动画更新绕过 React Reconciler**：驱动器在 JS 侧每步更新 **`Animated.Value` / `ValueXY`**，再 **直接写回场景树节点** 的可动画字段，**标记脏** 并调用既有 **`queueLayoutPaintFrame`** 路径重绘（与 [技术调研](../../core/technical-research.md) §12、路线图 Step 12 一致）。
- **V1 可动画样式子集** 与 RN **`useNativeDriver: true` 常见子集一致**：**`opacity` + `transform`**（含 `translateX` / `translateY` / `scale` / `rotate` 等 RN 常用键；具体键名与矩阵合成顺序在实现时与现有 `ViewStyle` / 绘制管线对齐）。
- **V1 包含**：`Animated.Value`、`Animated.ValueXY`、`Animated.timing`、`Animated.spring`、`Animated.decay`、`Animated.loop`、`Animated.interpolate`（含常用 **`extrapolate` / `extrapolateLeft` / `extrapolateRight` 语义**）、`Animated.parallel` / `sequence` / `stagger`；宿主组件 **`Animated.View`、`Animated.Text`、`Animated.Image`、`Animated.SvgPath`**。
- **模块落点**：在 **`@react-canvas/react`** 内实现（建议子目录 `src/animated/`），自包入口 **导出 `Animated` 命名空间**（见 §6），不强制新增独立 npm 包名（若日后体积分拆可再引入 `@react-canvas/animated` 而不改对外 API 形状）。

### 1.2 非目标（V1 不承诺）

- **`Animated.event`**：与指针位移、`onScroll` / `contentOffset` 等的映射 **不纳入 V1**；待 **`Animated.event`** 与滚动等能力（如路线图 **Step 9 ScrollView**）齐备后再迭代。
- **布局类动画**：**`width`、`height`、`margin`、`padding` 等** 的 **布局驱动动画** 不纳入 V1；若用户在 `style` 中误传此类键，**开发模式下**应 **warning 或 dev-only 抛错**（具体策略在实现计划中二选其一并写死，见 §5.3）。
- 与 **Reanimated**、**CSS 动画**、**Web Animations API** 等 **等价** 或 **桥接**：不在本规格范围。

---

## 2. 前置依赖（与「尽可能多实现」的约束）

| 依赖项                         | 说明                                                                                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`transform` 绘制与样式模型** | 当前仓库 **阶段五 Step 10** 规划在 `ViewStyle` / `paint` 中支持 `transform` → Skia `concat(matrix)`）。**`transform` 动画** 依赖该能力；**交付顺序** 上应 **先或并行** 完成「节点可存 transform + 绘制应用」再宣称 **transform 动画** 验收通过。 |
| **`opacity`**                  | 已在 `ViewStyle` / 绘制路径中存在；**opacity 动画** 可不依赖 Step 10，但 **整体验收** 仍以 §1.1 全量为准，不单独以「仅 opacity」作为长期里程碑。                                                                                                 |
| **帧调度**                     | 复用现有 **`queueLayoutPaintFrame`** / Surface rAF；**不** 为 Animated 单独引入第二套全局 rAF，除非性能评估后证明必要（若引入须在实现计划中说明）。                                                                                              |

---

## 3. 已确认决策摘要

| #   | 主题                       | 决议                                                                                                       |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | **API 形态**               | **尽量对齐 RN `Animated`**（命名与常见用法）。                                                             |
| 2   | **可动画属性**             | **仅 `opacity` + `transform`**（对齐 RN 原生驱动子集）；布局动画 **V1 不做**。                             |
| 3   | **插值与组合**             | V1 包含 **`interpolate`**（含 extrapolate）与 **`parallel` / `sequence` / `stagger`**。                    |
| 4   | **`Animated.event`**       | **V1 不包含**；后续版本或 ScrollView 就绪后另做。                                                          |
| 5   | **loop / decay / ValueXY** | **V1 包含**；规格与文档中说明与 `spring` 等的选择关系。                                                    |
| 6   | **宿主**                   | **`Animated.View`、`Animated.Text`、`Animated.Image`、`Animated.SvgPath`**；动画只绑定 **白名单** 样式键。 |
| 7   | **模块边界**               | **方案 A**：`@react-canvas/react` 内聚实现；对外导出 `Animated`。                                          |
| 8   | **实现饱和度**             | **尽可能多实现**：在 §1.1 范围内 **尽量一次交付完整**，避免「API 已导出但 transform 长期无效果」的终态。   |

---

## 4. 架构与数据流

### 4.1 分层

| 层级           | 职责                                                                                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **值与驱动**   | `Animated.Value` / `ValueXY` 存储当前值、订阅者；`timing`、`spring`、`decay` 等按时间推进插值；`loop` 包装子动画；`interpolate` 从输入值映射到输出范围。                                                |
| **组合**       | `parallel`、`sequence`、`stagger` 编排多个 `Animation` / 复合对象，**不** 引入额外绘制路径。                                                                                                            |
| **绑定与写回** | `Animated.*` 宿主在 **mount** 时向内部注册表 **关联** `SceneNode` 引用（或经 Canvas 提供的稳定句柄）；**unmount** 时注销；**仅** 更新该节点上的 **opacity / transform**（及未来若扩展白名单须改规格）。 |
| **脏与重绘**   | 写回后 **`node.dirty = true`**，调用 **`queueLayoutPaintFrame`**（与 `commitUpdate` 之后补帧逻辑一致）。                                                                                                |

### 4.2 与 Reconciler 的关系

- **禁止** 依赖 `setState` 每帧驱动动画（避免 reconcile 开销）。
- **初始** `style` 仍由 React props 经 **Commit** 写入；**动画运行期** 覆盖 **可动画字段** 的 **有效值** 为 **Animated 管线** 写入的值（与 RN 心智一致：若需与 props 合并规则，在实现计划中写清「动画覆盖 vs 静态 base」优先级）。

### 4.3 命中与交互

- **transform / opacity** 改变后，命中检测应使用 **与绘制一致的** 世界坐标与变换（若当前命中为布局框简化，**旋转/缩放** 下的精确度需在实现或后续专页中说明；V1 至少 **与 paint 使用同一套变换**）。

---

## 5. 行为与错误处理

### 5.1 白名单

- **V1 仅允许** 对 **`opacity`** 与 **`transform`**（及 RN 等价结构）做动画写回。
- 若 `Animated.*` 的 `style` 中出现 **非白名单** 键：**开发模式** 下 **warning 或 dev-only 抛错**（二选一，在实现计划中固定）。

### 5.2 生命周期

- 支持 **`stopAnimation`**、**`reset`** 等 RN 常见生命周期（与 RN 差异列表写在用户文档）。
- 组件卸载时 **取消** 未结束动画，**释放** 对 `SceneNode` 的引用，避免泄漏与悬空写回。

### 5.3 与 RN 的差异（须在文档中显式列出）

- 无 **`useNativeDriver`**：本运行时无「原生线程」；**所有** 动画均在 **JS 主线程** 执行，但 **仍** 绕过 React reconcile。
- **无 `Animated.event`（V1）**。
- **布局属性不可动画（V1）**。

---

## 6. 包与导出

- 在 **`packages/react/src/index.ts`**（或等价入口）增加 **`export { Animated }`**（或具名导出与 RN 接近的表面积）。
- 若需 **子路径导出**（如 `@react-canvas/react/animated`），可选；**非** V1 必达。

---

## 7. 测试与文档

### 7.1 测试

- **单元测试**：插值边界、缓动、`interpolate` 的 extrapolate、`parallel` / `sequence` / `stagger` 的完成与取消、`loop` 迭代、`decay` 收敛（可使用 **可控时间** 或 fake timers）。
- **集成测试**：动画结束后 **场景节点** 上 **opacity / transform** 与预期一致（在 **transform** 绘制就绪后补充）；沿用 **`vite-plus/test`** 与仓库既有 headless 约定。

### 7.2 文档

- 在 **`apps/website`** 增加 **Animated** 专页：API 概览、**V1 限制**、**与 RN 差异**、**前置依赖（transform）**。
- 可选：在 Playground 中增加 **最小示例**（与 [website-starlight-docs](../../../.cursor/rules/website-starlight-docs.mdc) 约定一致）。

---

## 8. 验收标准（节选）

- 在 **transform 绘制已就绪** 的前提下：`Animated.timing` / `spring` 驱动 **opacity** 与 **transform** 在 **View / Text / Image / SvgPath** 上可见且 **帧率稳定**（无每帧全量 `setState`）。
- 若 **仅** 验证 **opacity**：可作为 **中间 CI 检查**，但 **不能** 替代 §1 与 §2 的 **整体验收**。

---

## 9. 交叉引用

- [development-roadmap.md](../../development-roadmap.md) — 阶段六 Step 11–12
- [technical-research.md](../../core/technical-research.md) §12、§15.11
- [hostconfig-guide.md](../../react/hostconfig-guide.md) — commit 路径与场景树更新约定
