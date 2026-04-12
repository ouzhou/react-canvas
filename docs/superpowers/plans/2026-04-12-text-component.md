# Text 组件（CanvasKit Paragraph）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans，按任务勾选 `- [ ]` 逐步实施。

**Goal:** 按 `docs/superpowers/specs/2026-04-12-text-component-design.md` 分阶段交付：先完成 **M1（默认字体并入 `initRuntime` 的 loading、Scene 文本节点、Skia 绘制、`<Text>`、v2 可见）**，再实施 **M2（Yoga measure + 换行）** 与 **M3（嵌套与样式继承）**。

**Architecture:** `initCanvasKit` 已是模块单例（`packages/core-v2/src/render/canvaskit.ts`），在 **`initRuntime` 的 `Promise` 链中**于 CK 就绪后 **`fetch` 字体 → 注册到同一 CK 实例**，保证 `CanvasProvider` 的 `loading` 覆盖字体阶段；`SceneRuntime` 增加 **`kind: 'text'`** 节点与 **`insertText`**（M1 用固定 `ViewStyle` 尺寸驱动 Yoga，不实现 `measureFunc`）；`attachSceneSkiaPresenter` 在布局提交中识别 text 节点并 **`Paragraph` 绘制**；`react-v2` 提供与 `View` 同模式的 **`Text`** 组件；`apps/v2` 增加 **text** 演示入口。

**Tech Stack:** TypeScript、Vite+（`vp test` / `vp check`）、`canvaskit-wasm`、`yoga-layout`、`packages/core-v2`、`packages/react-v2`、`apps/v2`。

**规格对照：** M1 ↔ 规格 §1.1 M1、§3、§4.1、§5（仅平铺字符串子集）、§7（text 分支）、§9（最小 API）；M2 ↔ §4.3、§5.3；M3 ↔ §5–§6、§8。

---

## 文件结构（将创建 / 修改）

| 路径                                                                | 职责                                                                                                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/core-v2/src/fonts/builtin.ts`（新建）                     | `BUILTIN_PARAGRAPH_FONT_URL` 常量                                                                                |
| `packages/core-v2/src/fonts/load-default-paragraph-font.ts`（新建） | `fetch` + `ArrayBuffer` + CK 注册；失败抛错                                                                      |
| `packages/core-v2/src/runtime/init-runtime.ts`                      | `Runtime` 扩展；`initRuntime` 在 `loading` 内串联字体加载；`RuntimeOptions.loadDefaultParagraphFonts` 默认行为   |
| `packages/core-v2/src/scene/scene-node.ts`                          | `kind`、`textContent`（M1）、预留 `slots`/`textStyle`（M3）                                                      |
| `packages/core-v2/src/runtime/node-store.ts`                        | 创建 text 节点时初始化 `yogaNode` 与可选 `kind`                                                                  |
| `packages/core-v2/src/runtime/scene-runtime.ts`                     | `insertText` / `updateText`（或 M1 仅 `insertText` + `updateStyle` 扩展）；`LayoutSnapshot` 含 text 绘制所需字段 |
| `packages/core-v2/src/layout/layout-sync.ts` 等                     | 若 `buildLayoutSnapshot` 逻辑分散，保证 text 节点 `absLeft`/`absTop`/`width`/`height` 进入 payload               |
| `packages/core-v2/src/render/scene-skia-presenter.ts`               | `paintSubtree` 中 `kind === 'text'` 分支：Paragraph 绘制                                                         |
| `packages/core-v2/src/index.ts`                                     | 导出常量 / 类型                                                                                                  |
| `packages/core-v2/tests/init-runtime.test.ts`                       | mock `fetch` + 字体加载与 **ready 晚于** CK 单体的断言                                                           |
| `packages/core-v2/tests/...`（新建）                                | text 节点布局 + presenter 行为（能 mock CK 时测 Paragraph 构建；否则测 runtime API）                             |
| `packages/react-v2/src/text.tsx`（新建）                            | `<Text>`：`children` 字符串、`style` 最小集                                                                      |
| `packages/react-v2/src/index.ts`                                    | 导出 `Text`、`TextProps`                                                                                         |
| `packages/react-v2/tests/text.test.tsx`（新建）                     | 挂载后 scene 图含 text 节点 id                                                                                   |
| `apps/v2/src/smoke-types.ts`                                        | `SmokeDemoId` 增加 `text`                                                                                        |
| `apps/v2/src/react-smoke.tsx`（或等价）                             | `demo === "text"` 时渲染 `<Text>`                                                                                |
| `apps/v2/src/App.tsx`                                               | 工具栏 hint 文案含 `demo=text`                                                                                   |

**已知现状：** `createSceneRuntime` 单独 `loadYoga()`，与 `initRuntime` 的 Yoga 非同一引用；M1 **不强制**合并二者，只要 **`initRuntime` 完成后再挂载 `Canvas`**（当前 `CanvasRuntime` 已如此）且 **Presenter 使用同一 `initCanvasKit` 单例** 即可共享已注册字体。

---

### Task 1：默认字体常量与加载函数

**Files:**

- Create: `packages/core-v2/src/fonts/builtin.ts`
- Create: `packages/core-v2/src/fonts/load-default-paragraph-font.ts`
- Modify: `packages/core-v2/src/index.ts`（导出 `BUILTIN_PARAGRAPH_FONT_URL`）

- [ ] **Step 1：新增 `builtin.ts`**

```ts
/** 默认正文：Noto Sans SC Subset OTF（与规格 §3.1 一致）。 */
export const BUILTIN_PARAGRAPH_FONT_URL =
  "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf";
```

- [ ] **Step 2：实现 `loadDefaultParagraphFont(ck: CanvasKit, url: string): Promise<{ familyName: string }>`**

依据 `canvaskit-wasm` 类型选择注册 API（常见模式：`ck.FontMgr?.FromData?.([buffer])` 或文档推荐入口）；**失败时 `throw new Error(...)`**（含 `url` 片段便于排查）。返回值中 `familyName` 供 Paragraph 使用（若 CK 需显式字体名，以注册结果为准）。

- [ ] **Step 3：从 `index.ts` 导出 URL 常量（及加载函数若其它模块需单测直接调用）。**

- [ ] **Step 4：`vp test`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp test packages/core-v2`  
Expected: 全绿（仅新增文件时尚无测试，需 Step 2 后补最小单测或对加载函数做 `fetch` mock）。

- [ ] **Step 5：Commit**（按团队习惯，例如 `feat(core-v2): add builtin paragraph font URL and loader`）

---

### Task 2：`initRuntime` 合并字体到 loading 链

**Files:**

- Modify: `packages/core-v2/src/runtime/init-runtime.ts`
- Modify: `packages/core-v2/tests/init-runtime.test.ts`

- [ ] **Step 1：扩展 `Runtime` 与 `RuntimeOptions`**

在 `Runtime` 中增加 M1 所需字段，例如：

```ts
export type Runtime = {
  yoga: Yoga;
  canvasKit: CanvasKit;
  /** M1：已注册、可供 Paragraph 使用的逻辑字体名 */
  defaultParagraphFontFamily: string;
};
```

`RuntimeOptions`：`defaultParagraphFontUrl?: string`（覆盖常量）；`loadDefaultParagraphFonts?: boolean` — **建议默认 `true`**（与规格「默认字体」一致；`false` 用于无网络测试时需文档说明）。

- [ ] **Step 2：改写 `runtimePromise` 链**

在现有 `Promise.all([loadYoga(), initCanvasKit()])` 成功后 **`await loadDefaultParagraphFont(ck, url)`**（当 `loadDefaultParagraphFonts !== false`），再 `setSnapshot({ status: "ready", runtime })`。整个期间 **`getRuntimeSnapshot()` 保持 `loading`**，直至字体注册完成。

- [ ] **Step 3：单测 `init-runtime.test.ts`**

- Mock `initCanvasKit` 仍为 resolved 假 CK；增加 **`globalThis.fetch` mock**：第一次返回 `arrayBuffer()` 为 **空 Uint8Array** 或 **合法 OTF 片段**（按你实现的解析要求）。
- 断言：在 `initRuntime()` 调用后立刻 `expect(getRuntimeSnapshot().status).toBe("loading")`；**仅在 fetch resolve 且注册逻辑跑完后** 才 `ready`。
- 增加 **字体失败** 用例：`fetch` reject → `getRuntimeSnapshot().status === "error"` 且 `initRuntime()` reject。

- [ ] **Step 4：`vp test packages/core-v2` 与 `vp check`**

- [ ] **Step 5：Commit**

---

### Task 3：`SceneNode` 文本形态与 node-store

**Files:**

- Modify: `packages/core-v2/src/scene/scene-node.ts`
- Modify: `packages/core-v2/src/runtime/node-store.ts`

- [ ] **Step 1：`SceneNode` 增加判别字段**

```ts
export type SceneNodeKind = "view" | "text";

export type SceneNode = {
  // ...existing
  kind?: SceneNodeKind; // 缺省视为 "view" 以保持旧数据兼容
  /** M1：纯文本；M3 演进为 slots */
  textContent?: string;
};
```

- [ ] **Step 2：在 `NodeStore` 增加 `createTextChildAt(parentId, id, text, label?)` 或等价**

创建节点时：`kind: "text"`、`textContent`、**仍创建 `yogaNode`** 并挂到父（与现有 `createChildAt` 对齐）；**不**为 M1 设置 `measureFunc`。

- [ ] **Step 3：单测**

创建含 text 子节点的 store，断言 `get(id)?.kind === "text"` 且 `textContent` 正确。

- [ ] **Step 4：`vp test` + Commit**

---

### Task 4：`SceneRuntime.insertText` 与布局提交

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`
- Modify: `packages/core-v2/src/runtime/scene-runtime.ts` 中 `LayoutSnapshot` 类型（若需把 `textContent` / `kind` 透传给 presenter）
- 可能修改: `packages/core-v2/src/layout/layout-sync.ts`（若布局快照不经过 `scene-runtime` 集中构建）

- [ ] **Step 1：`SceneRuntime` 类型增加 `insertText(parentId: string, id: string, text: string, style: ViewStyle): void`**

语义：若 `id` 已存在则更新 `textContent` 与合并 `viewStyle` 并重算布局（与 `insertView` 幂等模式对齐）。**M1** 要求调用方传入 **明确 `width`/`height`（或项目已支持的百分比规则）**，以便 Yoga 给出合法 `layout`。

- [ ] **Step 2：`buildLayoutSnapshotWithoutRun`（或等价）对 `kind === "text"` 附带 `textContent`**

使 `LayoutCommitPayload.layout[id]` 含 presenter 所需字段，例如扩展：

```ts
// LayoutSnapshot 条目上增加可选：
textContent?: string;
nodeKind?: "view" | "text";
```

（命名与现有 `backgroundColor` 风格一致即可，全文统一。）

- [ ] **Step 3：单测**

`createSceneRuntime` → `insertText(contentRoot, "t1", "你好", { width: 200, height: 48 })` → 断言 `getLayoutSnapshot()["t1"].width === 200` 且快照含 `textContent`。

- [ ] **Step 4：`vp test` + Commit**

---

### Task 5：Skia Presenter 绘制 Text

**Files:**

- Modify: `packages/core-v2/src/render/scene-skia-presenter.ts`

- [ ] **Step 1：在 `paintSubtree` 中，处理完 `backgroundColor` 矩形后，若 `nodeKind === "text"` 且 `textContent`**

使用 **同一 `ck` 实例**（文件顶部已通过 `initCanvasKit()` 获取）构建 `Paragraph` / `ParagraphBuilder`：**字体族**使用 `Runtime` 不可直接访问时，M1 可 **硬编码与 `loadDefaultParagraphFont` 返回值一致** 的常量，或把 `defaultParagraphFontFamily` 经 `attachSceneSkiaPresenter` options 注入（推荐后者：从 `react-v2` 的 `CanvasProvider` `runtime` 传入 `SceneSkiaCanvas` → `attachSceneSkiaPresenter`）。

- [ ] **Step 2：文本颜色 M1**

默认 `#111827` 或与 `Text` 的默认 `style.color` 一致；**DPR**：沿用现有 `skCanvas.scale(rootScale, rootScale)`，Paragraph 字号使用逻辑 px × 比例（与现有矩形一致）。

- [ ] **Step 3：手动或单测**

若 golden 未就绪：在 `apps/v2` 目验；单测可 mock 最小 `CanvasKit` 对象验证「text 分支调用了 paragraph paint」。

- [ ] **Step 4：`vp test` + Commit**

---

### Task 6：`react-v2` 的 `<Text>`

**Files:**

- Create: `packages/react-v2/src/text.tsx`
- Modify: `packages/react-v2/src/index.ts`
- Create: `packages/react-v2/tests/text.test.tsx`

- [ ] **Step 1：`Text` 组件 API（M1 子集）**

```tsx
export type TextProps = {
  id?: string;
  style?: ViewStyle; // M1：用 width/height 等驱动盒；颜色可映射到 core 快照字段（见 Task 5）
  children?: React.ReactNode; // M1：仅允许 string；非 string 在 dev 抛错或忽略并 console.warn（与规格 §5 对齐选一种写死）
};
```

生命周期：照抄 `view.tsx` 的 `queueMicrotask` 等待父节点；调用 **`rt.insertText`**（需在 `SceneRuntime` 类型上暴露）。

- [ ] **Step 2：测试**

`CanvasRuntime` + `<View style={{ width: 300, height: 200 }}><Text style={{ width: 200, height: 40 }}>abc</Text></View>`，断言 `getSceneGraphSnapshot()` 或 `hasSceneNode`。

- [ ] **Step 3：`vp test packages/react-v2` + Commit**

---

### Task 7：`apps/v2` 文本演示

**Files:**

- Modify: `apps/v2/src/smoke-types.ts`
- Modify: `apps/v2/src/react-smoke.tsx`（或当前渲染 React smoke 的文件）
- Modify: `apps/v2/src/App.tsx`

- [ ] **Step 1：`SmokeDemoId` 增加 `"text"`，`SMOKE_DEMO_LIST` 增加「文字（M1）」**

- [ ] **Step 2：React tab 下 `demo === "text"` 渲染含中文与英文的 `<Text>`**，背景 `View` 便于对比。

- [ ] **Step 3：浏览器打开 `?smoke=react&demo=text` 目验可见字形**

- [ ] **Step 4：`vp check`（全仓）**

- [ ] **Step 5：Commit**

---

## M2：换行与 Yoga 测量（概要任务）

**Files（预期）：** `packages/core-v2/src/layout/...`（`measureFunc` 绑定）、`scene-runtime.ts`（text 节点不再强制固定高）、`scene-skia-presenter.ts`（按测量宽重排）、单测覆盖规格 §10 M2。

- [x] **Task M2-1：** 为 `kind === "text"` 的 `YogaNode` 设置 **`setMeasureFunc`**，内部用 **Paragraph layout** 返回 `(width, height)`（宽度优先、RN 语义）。
- [x] **Task M2-2：** 移除 M1 对固定高度的依赖路径；`insertText` / `updateText` 在宽度变化时 **invalidate** paragraph 缓存。（当前实现：每次 measure 内联构建 Paragraph，无跨帧缓存；固定 `height` 时 `unsetMeasureFunc`。）
- [x] **Task M2-3：** 单测：窄盒多行高度 **`>`** 单行；`"\n"` 行数增加。
- [x] **Task M2-4：** `vp test` + Commit。

---

## M3：嵌套 `<Text>` 与 `TextStyle` 继承（概要任务）

**Files（预期）：** `packages/core-v2/src/scene/...`（`slots`）、`packages/react-v2/src/text.tsx`（children 递归）、`style` 类型拆出 `TextStyle`、`hitTestAt` 行为确认（整块盒，§8）。

- [ ] **Task M3-1：** `SceneNode` 演进为 **`slots` + `textStyle`**；扁平化为 runs 的工具函数与单元测试。
- [ ] **Task M3-2：** Reconciler 校验 **禁止 `<View>` 入 `<Text>`**、**禁止裸字符串入 `<View>`**（dev）。
- [ ] **Task M3-3：** Presenter 多 run / 多 `TextStyle` 绘制；与 §6 表对齐。
- [ ] **Task M3-4：** `vp test` + 更新规格中的「已知限制」若有 CK 边界。

---

## 自检（对照 writing-plans Self-Review）

| 规格章节           | 覆盖任务                        |
| ------------------ | ------------------------------- |
| §1.1 M1            | Task 1–7                        |
| §3 字体与 loading  | Task 1–2                        |
| §4.1 kind          | Task 3–4                        |
| §4.2 slots（完整） | M3                              |
| §4.3 measure       | M2                              |
| §5–§6 嵌套样式     | M3                              |
| §7 绘制            | Task 5                          |
| §8 命中            | M3（M1 可用整盒，与 view 相同） |
| §9 API             | Task 6–7                        |

**占位符扫描：** 计划中 **Paragraph 具体 CK API 名** 以实现时类型定义为准；实施时须在 Task 5 代码中写死真实调用，不得留 `TODO` 在合并代码中。

---

## 执行方式（完成后由执行者选择）

**计划已保存至 `docs/superpowers/plans/2026-04-12-text-component.md`。**

1. **Subagent-Driven（推荐）**：每任务独立子代理 + 任务间审查 — 使用 **superpowers:subagent-driven-development**。
2. **Inline Execution**：本会话用 **superpowers:executing-plans** 批量执行并设检查点。

请选择其一进行落地实现。
