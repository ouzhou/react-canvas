# 阶段二（M2）：文字能力 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务顺序执行；步骤使用 `- [ ]` 勾选。每完成一个 **Task** 建议 `git commit` 一次。验证统一用 **`vp`**（见根目录 `AGENTS.md`）。测试断言从 **`vite-plus/test`** 导入。

**Goal:** 实现 `<Text>` 宿主、Yoga `measureFunc` + Skia Paragraph 测量与绘制、嵌套 `Text` 与字符串叶子、换行 / `numberOfLines` / 省略号 / 行高 / 样式继承（Skia 能力边界内），并 **运行时强制 R-HOST-1～4**，满足 [2026-04-05-phase-2-clarifications-design.md](../specs/2026-04-05-phase-2-clarifications-design.md) 与 [development-roadmap.md](../../development-roadmap.md) 阶段二 Step 4–5。

**Architecture:** `core` 持有 **Text 场景节点**（与 `ViewNode` 并列或共享基类）、**Paragraph 构建与测量**、**paint 分支**；`react` 仅扩展 HostConfig（`"Text"`、`createTextInstance`、`getChildHostContext`、文本更新）与 `<Text>` 组件。**帧调度** 已在 `@react-canvas/core` 的 `queueLayoutPaintFrame`（见阶段一后续迁移），根上仍从 `sceneRoot` 进入布局/绘制。

**Tech Stack:** 既有 `yoga-layout`（`wasm-async`）、`canvaskit-wasm`、React 19 + `react-reconciler@0.33.x`；**不**在 M2 实现自定义字体加载（仅默认字体栈）。

**前置阅读:** [hostconfig-guide.md](../../hostconfig-guide.md)、[runtime-structure-constraints.md](../../runtime-structure-constraints.md)、CanvasKit 文档中 **Paragraph / ParagraphBuilder**（版本以仓库锁定为准）。

---

## 文件结构（计划新增 / 大改）

| 路径                                                        | 职责                                                                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/text-style.ts`（或并入 `view-style.ts`） | `TextStyle`：在 `ViewStyle` 上扩展 `fontSize`、`color`、`fontWeight`、`textAlign`、`lineHeight`、`numberOfLines`、`ellipsizeMode` 等（以 clarifications 与 Skia 可行为准）。          |
| `packages/core/src/text-node.ts`                            | `TextNode`：Yoga 节点、`setMeasureFunc`、子树片段（嵌套 `Text` + 字符串叶子）维护、脏标记、**展平为 Paragraph 输入**（或委托 `paragraph-build.ts`）。                                 |
| `packages/core/src/paragraph-build.ts`（名称可调整）        | 给定 `CanvasKit`、展平后的 spans + 宽度约束，构建 **Paragraph** 并返回 **layout 尺寸**（供 measure 与 paint 复用）。                                                                  |
| `packages/core/src/scene-node.ts`（可选）                   | `export type SceneNode = ViewNode \| TextNode` 与类型守卫；若用 **公共基类** 替代并集，则 `scene-node-base.ts`。                                                                      |
| `packages/core/src/view-node.ts`                            | 子节点类型从「仅 `ViewNode`」扩展为 **`SceneNode[]`**（或基类数组）；`paint` 递归、`destroy` 一致。                                                                                   |
| `packages/core/src/yoga-map.ts` / `splitStyle`              | `Text` 的布局键仍走 Yoga；**文字专有键**写入 `TextNode` 的 `textProps`，不走 `ViewVisualProps`。                                                                                      |
| `packages/core/src/paint.ts`                                | `paintNode` 对 `TextNode` 分支：`drawParagraph`（或等价），坐标含 **padding 内偏移**；`ViewNode` 逻辑保持。                                                                           |
| `packages/core/src/layout.ts`                               | 根 `calculateLayout` 仍从 **场景根 `ViewNode`** 进入；确保 Text 的 measure 在 Yoga 计算链中被调用。                                                                                   |
| `packages/core/src/index.ts`                                | 导出 `TextNode`、`TextStyle`、`Paragraph` 相关类型（按需）。                                                                                                                          |
| `packages/core/tests/text-*.test.ts`                        | measure 高度、行数、省略、嵌套继承（**无数像素快照**）。                                                                                                                              |
| `packages/react/src/text.tsx`                               | `export function Text(props: TextProps) { return null; }`（宿主组件，与 `view.ts` 同模式）。                                                                                          |
| `packages/react/src/reconciler-config.ts`                   | `createInstance` 支持 `Text`；`createTextInstance`；`getChildHostContext` 传 `isInText`；`appendChild`/`insertBefore`/`commitTextUpdate`；实例类型改为 **`SceneNode`**；R-HOST 抛错。 |
| `packages/react/src/canvas.tsx`                             | 若 `sceneRoot` 类型或单子规则变化（例如仅要求唯一 **场景根** 子节点仍为 `View`），与此对齐。                                                                                          |
| `packages/react/src/jsx-augment.d.ts`                       | 增加 `Text` 的 intrinsic 元素与 `TextStyle`。                                                                                                                                         |
| `packages/react/src/index.ts`                               | `export { Text }`。                                                                                                                                                                   |
| `packages/react/tests/text-host.test.tsx`（名称可调整）     | 非法：`View` 下裸字符串；`Text` 下 `View`。合法：`<View><Text/></Text></View>` 等。                                                                                                   |
| `apps/website/`                                             | 可选：阶段二 Text demo 页或扩展现有 playground。                                                                                                                                      |

---

### Task 1: Core — `TextStyle` 与样式拆分

**Files:**

- Create: `packages/core/src/text-style.ts`
- Modify: `packages/core/src/yoga-map.ts`（`splitStyle` 或新增 `splitTextStyle`：布局键 vs 文字键）
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1:** 在 `text-style.ts` 定义 `export type TextStyle = ViewStyle & { fontSize?: number; color?: string; fontWeight?: ...; textAlign?: 'left'|'center'|'right'; lineHeight?: number; numberOfLines?: number; ellipsizeMode?: 'tail'; ... }`，**仅包含 M2 会实现的键**；注释标明「其余 RN 键未支持」。

- [ ] **Step 2:** 实现 `splitTextStyle(style: TextStyle): { layout: ViewStyle; text: TextOnlyProps }`，把 **margin/padding/width/height/flex** 等留在 `layout`，文字专有键进 `text`。

- [ ] **Step 3:** `vp check`（`packages/core` 或根目录）。

- [ ] **Step 4:** Commit：`feat(core): TextStyle and text/layout split`

---

### Task 2: Core — `TextNode` 骨架与场景树类型

**Files:**

- Create: `packages/core/src/text-node.ts`
- Modify: `packages/core/src/view-node.ts`（子节点类型）
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1:** 定义 `SceneNode`：`export type SceneNode = ViewNode | TextNode`（若命名冲突，用 `import type` 与 `instanceof` 守卫）。

- [ ] **Step 2:** `ViewNode`：`children: SceneNode[]`；`appendChild` / `removeChild` / `insertBefore` 接受 `SceneNode`；`destroy` 递归释放 **TextNode** 资源（若有 Paragraph 缓存则 `delete()`）。

- [ ] **Step 3:** `TextNode` 构造：`super` 或独立持有 `yoga.Node`（与 `ViewNode` 同 `initYoga`）；`type === 'Text'`；**暂不**实现 `setMeasureFunc`（先占位空测量返回 (0,0) 或 `throw`，以便测试编译）。

- [ ] **Step 4:** 失败测试 `packages/core/tests/text-node-tree.test.ts`：创建 `TextNode`，`appendChild` 另一个 `TextNode`，断言父子关系与 Yoga 子节点索引。

```typescript
import { describe, it, expect, beforeAll } from "vite-plus/test";
import { initYoga } from "../src/yoga-init.ts";
import { ViewNode } from "../src/view-node.ts";
import { TextNode } from "../src/text-node.ts";

describe("TextNode tree", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;
  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("nested TextNode is linked under ViewNode", () => {
    const root = new ViewNode(yoga, "View");
    const t = new TextNode(yoga);
    root.appendChild(t);
    expect(root.children).toContain(t);
    expect(t.parent).toBe(root);
  });
});
```

运行：`cd packages/core && vp test packages/core/tests/text-node-tree.test.ts`。**期望：** 通过（在 Step 3 最小实现后）。

- [ ] **Step 5:** Commit：`feat(core): TextNode and SceneNode wiring`

---

### Task 3: Core — Paragraph 构建与 Yoga measure

**Files:**

- Create: `packages/core/src/paragraph-build.ts`
- Modify: `packages/core/src/text-node.ts`
- Modify: `packages/core/tests/paragraph-measure.test.ts`（新建）

- [ ] **Step 1:** 阅读 `canvaskit-wasm` 类型定义中 **`ParagraphBuilder` / `Paragraph.style` / `pushStyle` / `addText` / `build()` / `layout()` / `getHeight()` / `getLongestLine()`** 等（以实际导出为准）。实现 `measureParagraph(ck: CanvasKit, text: TextOnlyProps, maxWidth: number, content: string): { width: number; height: number }`（或返回 Paragraph 句柄供后续 paint 复用——与 **缓存策略** 见 clarifications：首版可每次 measure 新建，后续加脏标记）。

- [ ] **Step 2:** `TextNode` 上存储 **展平后的字符串**（Task 4 由 reconciler 填充）；`setMeasureFunc` 内：根据 Yoga 传入的 **宽度约束**（`MeasureMode`）计算 `maxWidth`，调用 `measureParagraph`，返回 `{ width, height }`（高度含多行；`numberOfLines` 在 Paragraph 上设置 max lines / ellipsize，以 Skia API 为准）。

- [ ] **Step 3:** 测试 `paragraph-measure.test.ts`：`initYoga` + `initCanvasKit`（与现有工程一致），创建 **真实 `CanvasKit`**，对固定字符串与 `maxWidth` 断言 `height > 0` 且 **换行后高度**大于单行（验收「换行」的代理指标）。`testTimeout` 可设 `30_000`。若 Node 环境无法加载 CK，在测试中 **skip 并注明**（与阶段一计划一致），但 **本地 CI 目标** 为通过。

- [ ] **Step 4:** `vp test` + `vp check`。

- [ ] **Step 5:** Commit：`feat(core): Paragraph measure and TextNode measureFunc`

---

### Task 4: Core — 嵌套 `Text` 展平与样式继承

**Files:**

- Modify: `packages/core/src/text-node.ts`
- Modify: `packages/core/src/paragraph-build.ts`
- Create: `packages/core/tests/text-nested-flatten.test.ts`

- [ ] **Step 1:** 在 `TextNode` 上维护子内容模型：子节点为 **`TextNode`（嵌套）** 与 **字符串叶子**（由 React `commitTextUpdate` 同步）。实现 DFS **展平** 为 `Array<{ text: string; inheritedStyle: TextOnlyProps }>`，**内层 `TextStyle` 覆盖外层**（与 RN 一致：显式覆盖 `fontSize`/`fontWeight`/`color` 等）。

- [ ] **Step 2:** 单元测试：构造父 `TextNode` 设 `fontSize: 14`、子 `TextNode` 设 `fontWeight: 'bold'`（或等价枚举），展平结果中对应 span 继承 + 覆盖正确（**不断言像素**，只断言结构或 `Paragraph` 某可观测属性若可访问）。

- [ ] **Step 3:** Commit：`feat(core): nested Text flattening and style merge`

---

### Task 5: Core — `paintScene` 绘制 `TextNode`

**Files:**

- Modify: `packages/core/src/paint.ts`
- Modify: `packages/core/src/text-node.ts`（可选：缓存上一帧 `Paragraph` 供 paint 复用）

- [ ] **Step 1:** `paintNode` 入口类型改为 **`SceneNode`**（或重载）：若 `instanceof TextNode`，在 **`layout` 矩形内减去 padding`** 后 `skCanvas.drawParagraph(paragraph, x, y)`（坐标以 clarifications 与 phase-1 逻辑像素一致）；**不再**对 `TextNode` 绘制 `backgroundColor` 除非 spec 要求（M2 以 roadmap 为准；若仅文字，可跳过 View 式背景或按 RN 支持 —— **默认：Text 不画背景块，仅文字**）。

- [ ] **Step 2:** `ViewNode` 分支保持现有 `View` 绘制；子节点递归使用 `SceneNode`。

- [ ] **Step 3:** 集成测试或扩展 `paint-display-none.test.ts` 风格：若有能力 mock `drawParagraph` 调用计数则断言一次；否则 **manual** 网站验收。

- [ ] **Step 4:** Commit：`feat(core): paint TextNode with Paragraph`

---

### Task 6: React — `<Text>` 组件与 HostConfig

**Files:**

- Create: `packages/react/src/text.tsx`
- Modify: `packages/react/src/reconciler-config.ts`
- Modify: `packages/react/src/view.ts`（若需导出比较）
- Modify: `packages/react/src/index.ts`
- Modify: `packages/react/src/jsx-augment.d.ts`

- [ ] **Step 1:** `text.tsx`：`export const Text = 'Text' as const`（与 `View` 同模式）；`TextProps` 含 `style?: TextStyle`、`children?`。

- [ ] **Step 2:** 定义 **host context** 类型，例如 `{ isInText: boolean }`：`getRootHostContext` 返回 `{ isInText: false }`；`getChildHostContext(parentContext, type, _root)`：若父为 `Text` 或 `isInText` 为 true，子仍为 text 树则 `{ isInText: true }`；在 **`View` 下** 创建的 **下一路径** 保持 `isInText: false`，直到进入 `Text`。

- [ ] **Step 3:** `createInstance(type, props, _container, hostContext)`：
  - `type === View`：若 `hostContext.isInText === true`，**throw** `[react-canvas] R-HOST-2: View cannot appear inside Text.`
  - `type === Text`：`new TextNode(yoga)` + `setStyle(splitTextStyle(props.style))`（与 core API 对齐）。
  - 其他：**throw**。

- [ ] **Step 4:** `createTextInstance(text, root, hostContext, _internal)`：若 **`hostContext.isInText !== true`**（即在 `View` 下直接出现字符串），**throw** `[react-canvas] R-HOST-4: raw text must be inside <Text>.`；否则返回 **字符串** 或 **轻量对象**（与 `appendChild` 签名一致），供 `TextNode` 挂叶子。

- [ ] **Step 5:** `appendInitialChild` / `appendChild`：父为 `TextNode` 时，子可为 `TextNode` 或 text instance；更新 `TextNode` 内部片段列表并 **markDirty**。

- [ ] **Step 6:** `commitTextUpdate(textInstance, prev, next)`：同步字符串到 `TextNode` 叶子。

- [ ] **Step 7:** `prepareUpdate` / `commitUpdate`：支持 `Text` 的 `style` diff（与 `View` 类似，但用 `TextStyle`）。

- [ ] **Step 8:** `getPublicInstance`、`cloneMutableInstance` 等签名中的 `ViewNode` **全部替换为 `SceneNode`**（或泛型）。

- [ ] **Step 9:** `packages/react/src/jsx-augment.d.ts` 增加 `Text: { style?: TextStyle; children?: ReactNode; numberOfLines?: number; ... }`（与 `TextProps` 一致）。

- [ ] **Step 10:** `vp check`；`cd packages/react && vp test`（**jsdom**；见 `packages/react/vite.config.ts`）。

- [ ] **Step 11:** Commit：`feat(react): Text host and reconciler wiring`

---

### Task 7: React — 结构约束与集成测试

**Files:**

- Create: `packages/react/tests/text-host.test.tsx`
- Modify: `packages/react/tests/canvas-view.test.tsx`（若需 import `Text`）

- [ ] **Step 1:** 测试：`CanvasProvider` + `Canvas` + `<View><Text>hi</Text></View>` **挂载成功**（`act` 包裹）；若 WASM 慢，提高 timeout。

- [ ] **Step 2:** 测试：`<View>bare</View>` **expect throw**（R-HOST-4）。

- [ ] **Step 3:** 测试：`<Text><View /></Text>` **expect throw**（R-HOST-2）。

- [ ] **Step 4:** 测试：`<Text><Text nested</Text></Text>` **挂载成功**（R-HOST-3）。

- [ ] **Step 5:** Commit：`test(react): Text host structure constraints`

---

### Task 8: Website — 阶段二 demo（可选但推荐）

**Files:**

- Under `apps/website/`：新增或扩展示例

- [ ] **Step 1:** 展示 [development-roadmap.md](../../development-roadmap.md) 阶段二 **验收片段**（`View` 包 `Text`、`numberOfLines`、嵌套 `Text` 加粗）。

- [ ] **Step 2:** `vp build` 网站通过。

- [ ] **Step 3:** Commit：`feat(website): phase 2 text demo`

---

### Task 9: 文档与 roadmap 进度

**Files:**

- Modify: `docs/development-roadmap.md`（当前进度表）
- Optional: `docs/phase-2-design.md`（若要将大段从 clarifications 抽出）

- [ ] **Step 1:** 更新「Text 节点」「运行时结构校验 R-HOST-\*」行状态为 **完成** 或 **进行中**。

- [ ] **Step 2:** Commit：`docs: phase 2 progress`

---

### Task 10: 全仓验证

- [ ] **Step 1:** 根目录 `vp check`。

- [ ] **Step 2:** `cd packages/core && vp test`；`cd packages/react && vp test`。

- [ ] **Step 3:** `vp pack` 或 `vp build`（按仓库对 library 的发布约定）。

- [ ] **Step 4:** Commit：`chore: phase 2 verification`

---

## 风险与备忘

- **CanvasKit 在 Node 测试中的可用性：** 与阶段一相同；优先 **真实 WASM**；否则部分测试 skip 并文档化。
- **Paragraph API 版本差：** `canvaskit-wasm` 小版本间方法名可能不同；以 **锁文件版本** 与类型定义为准。
- **Yoga measure 返回值：** 须处理 `UNDEFINED` 宽度（max content）与 **exact/at most** 模式；查阅 `yoga-layout` 的 `MeasureOutput` / 当前包导出。
- **R-HOST 与 Fiber 顺序：** 校验须在 **commit** 路径完成；参考 [hostconfig-guide.md](../../hostconfig-guide.md)。
- **性能：** clarifications 允许先 **每次 measure 重建 Paragraph**；留下 `dirty`/`cache` 优化接口位。

---

## 规格溯源

- [2026-04-05-phase-2-clarifications-design.md](../specs/2026-04-05-phase-2-clarifications-design.md)
- [development-roadmap.md](../../development-roadmap.md) 阶段二 Step 4–5
- [runtime-structure-constraints.md](../../runtime-structure-constraints.md)
- [phase-1-design.md](../../phase-1-design.md)（隐式根、帧调度）

---

## Self-review（计划自检）

| 规格条目                                                    | 对应 Task                    |
| ----------------------------------------------------------- | ---------------------------- |
| Step 4 Text 节点 + measure + Paragraph 绘制                 | Task 1–5, 6                  |
| Step 5 换行、CJK（Skia）、numberOfLines、ellipsis、嵌套继承 | Task 3–4, 5                  |
| R-HOST-1～4                                                 | Task 6–7                     |
| 仅默认字体                                                  | Task 1, 3（不引入字体加载）  |
| LTR only                                                    | Task 3（不实现 RTL API）     |
| 测试无数像素黄金图                                          | Task 3–4, 7                  |
| Text 上 margin/padding                                      | Task 1–2（layout 键走 Yoga） |

**Placeholder 扫描：** 无 TBD；具体 Skia API 名称以实现时 typings 为准（Task 3 已要求先读类型定义）。

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-05-phase-2-implementation.md`.**

**执行方式可选：**

1. **Subagent-Driven（推荐）** — 每个 Task 派生子代理，任务间 review，迭代快。
2. **Inline Execution** — 本会话内按 `executing-plans` 批量执行并设检查点。

如需我按其中一种开始拆任务执行，直接说 **1** 或 **2**。
