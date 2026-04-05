# 阶段二（M2）实现澄清 — 设计记录

**日期：** 2026-04-05  
**状态：** 已与负责人通过问答确认，作为 [development-roadmap.md](../../development-roadmap.md) 阶段二（Step 4–5）的补充与收敛。  
**范围：** M2「看到文字」：Text 宿主、Yoga measure、Skia Paragraph 绘制、换行与富文本子集；不含阶段三交互及自定义字体加载（见下）。

---

## 1. 文档落点

| 方案                                  | 说明                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| **A. 本文件为阶段二澄清专页（采用）** | 记录决策与可执行边界；与 roadmap、`runtime-structure-constraints` 交叉引用。 |
| B. 仅写进 `phase-1-design.md`         | 阶段二篇幅过大，不宜与阶段一混在同一主文。                                   |
| C. 仅写 roadmap                       | 细节不足，不宜承载 Skia/测试边界等。                                         |

后续若需要「单页主规格」，可从本文件与 [phase-1-design.md](../../phase-1-design.md) 抽出 `phase-2-design.md`；**当前以本文件 + roadmap 为真相来源**。

---

## 2. 已确认决策摘要

| #   | 主题               | 决议                                                                                                                                                                     |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **交付范围**       | **Step 4 + Step 5 一并交付** 作为 M2 完成条件（与 roadmap 阶段二两步并列一致）。                                                                                         |
| 2   | **字体**           | **仅 CanvasKit/Skia 默认字体栈**；不做从 URL / `ArrayBuffer` 加载自定义字体（与 roadmap 阶段五「字体加载」区分）。                                                       |
| 3   | **方向与 bidi**    | **仅 LTR**；不承诺 RTL / `writingDirection` / 完整 Unicode bidi。                                                                                                        |
| 4   | **换行与空白**     | **以 Skia Paragraph 能稳定支持的行为为边界**；不强行对齐 RN 全量 `wordBreak` / `whiteSpace` 枚举；未覆盖项在类型或文档中标「未支持」或「依赖 Skia」。                    |
| 5   | **Emoji / 生僻字** | **不单独保证**；以默认字体实际渲染为准，可能出现 tofu；**文档说明**，不列为 M2 必修复缺陷。                                                                              |
| 6   | **自动化验收**     | **Vitest**：以 **测量与布局断言** 为主（宽高、行数、`numberOfLines` 截断等）；**像素/截图黄金测试不作为 M2 必达 CI**。                                                   |
| 7   | **`<Text style>`** | **对齐 RN 能力**：`<Text>` 上可直接使用 **影响布局盒的属性**（如 `margin` / `padding` / `width` 等），与 **Yoga + measure** 组合；不要求用户必须外包 `<View>` 才能留白。 |

---

## 3. 架构取向（与实现计划一致）

### 3.1 包边界

- **`@react-canvas/core`**：`Text` 对应节点类型、Yoga **measureFunc**、Skia **Paragraph** 的构建 / 测量 / 绘制、嵌套 `Text` **展平为 span**（或等价结构）的单一实现；**纯 JS 与 React 共用**。
- **`@react-canvas/react`**：HostConfig 扩展 `"Text"`、`createTextInstance`、**子树 host context**（用于 **R-HOST-2～4**）；**不**实现 Paragraph 细节。

### 3.2 Yoga measure 与 RN / Ink 的关系

- **模式一致**：文本作为 Yoga 叶子，通过 **measure 回调** 将「内在尺寸」交给 **文本后端**（RN 为原生 Text、Ink 为终端布局、本仓库为 **Skia Paragraph**）。**架构槽位相同，实现后端不同**。
- 不要求与 RN 像素级一致；以 **Skia 行为 + 本文档边界** 为准。

### 3.3 Paragraph 构建策略

| 方案                                    | 说明                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------ |
| **首版可：每次 measure 重建 Paragraph** | 实现快，便于对齐 Skia；大文本或高频更新时需注意 CPU。                    |
| **目标：带脏标记的缓存**                | 文本或样式或宽度约束变化时再重建；与「commit 后一帧 layout+paint」一致。 |

推荐 **以缓存为目标**；若排期紧张，可先 **首版重建 + 后续优化** 写入实现计划。

---

## 4. 运行时结构约束（须代码强制）

与 [runtime-structure-constraints.md](../../runtime-structure-constraints.md) 一致，M2 落地至少：

| 规则 ID  | 要求                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------- |
| R-HOST-1 | **`View` 下允许 `Text`**。                                                                            |
| R-HOST-2 | **`Text` 内禁止 `View`**（及后续定义的块级宿主）；违反须 **抛错**，信息指明「Text 内不可嵌套 View」。 |
| R-HOST-3 | **`Text` 内允许嵌套 `Text`** 与文本叶子（与 RN 一致）。                                               |
| R-HOST-4 | **`View` 下禁止裸字符串 / 裸文本**；在 `createTextInstance` 或首次挂子路径 **必须抛错**。             |

**检测点**：`getChildHostContext` 传递「是否在 `Text` 内」等标志；`createInstance` / `createTextInstance` / `appendChild` 路径校验；**commit 路径**抛错，与 [hostconfig-guide.md](../../hostconfig-guide.md) 一致。

---

## 5. 对测试与验收的影响

- **导入约定**：测试从 **`vite-plus/test`** 导入，由 **`vp test`** 执行（与 `AGENTS.md` 一致）。
- **core**：Paragraph 测量、换行、`numberOfLines`、省略号、嵌套样式继承等 **可数值化 / 可结构断言** 的行为。
- **react**：非法子树 **期望抛错**；合法树 **挂载 + 触发测量**。
- **不**将像素快照列为 M2 CI 必达；网站 demo 可作为人工验收，**非**自动化门禁。

---

## 6. 相关文档

- [development-roadmap.md](../../development-roadmap.md)（阶段二 Step 4–5）
- [runtime-structure-constraints.md](../../runtime-structure-constraints.md)
- [hostconfig-guide.md](../../hostconfig-guide.md)
- [phase-1-design.md](../../phase-1-design.md)
- [2026-04-04-phase-1-clarifications-design.md](./2026-04-04-phase-1-clarifications-design.md)

---

## 7. 下一步

经你审阅本文件无误后，使用 **writing-plans** 产出阶段二（Step 4–5）可执行任务清单；实现阶段 **不**在本澄清文档内展开代码细节。
