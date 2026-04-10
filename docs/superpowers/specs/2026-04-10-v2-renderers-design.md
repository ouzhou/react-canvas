# V2：可插拔渲染（DOM 调试 + Skia 占位）— 设计说明

**状态：已定稿（待实现）**  
**日期：2026-04-10**  
**范围：`packages/core-v2`、`packages/react-v2`、`apps/v2`**

**关联规格：** `docs/superpowers/specs/2026-04-10-v2-scene-yoga-events-design.md`（SceneRuntime + Yoga + 事件；本规格在其上扩展「渲染子系统」边界）。

---

## 1. 背景与目标

在 **SceneRuntime 仍为唯一真源**（场景树 + Yoga 布局 + 事件管线）的前提下，引入 **可替换的渲染后端**：

| 后端             | 职责（第一版）                                                      |
| ---------------- | ------------------------------------------------------------------- |
| **DOM 调试渲染** | 用 HTML/CSS 叠加层展示 **布局盒与节点标识**（纯调试，非最终像素）。 |
| **Skia 渲染**    | **占位**：接口或工厂存在，**不加载 CanvasKit**、不做真实绘制。      |

第一版 **实现 DOM 调试渲染** 与 **core 侧布局提交订阅**，并完成 **Skia 占位**，使后续接入 Skia 时 **不需推翻** `SceneRuntime` 与 React 集成方式。

**非目标（第一版）**

- Skia / CanvasKit 的真实像素绘制、纹理、文字 shaping 等。
- DOM 与 Skia 的 **视觉一致**（明确为非目标）。
- `zIndex`、多 Layer、整层 `captureEvents`（仍由事件规格排除，见关联文档 §7；本规格不扩展）。
- 将 DOM 调试层作为 **可访问的最终 UI**（其定位为开发者工具向叠加层）。

---

## 2. 第一版 DOM 渲染的定位（选型 A）

采用 **纯调试视图**：

- 每个场景节点对应 **至少一个** 可识别的叠加元素（以 `div` 为主，标签文字可用 `span`）。
- 展示 **Stage 坐标系下** 与 `getLayoutSnapshot()` **一致的轴对齐盒**（`absLeft` / `absTop` / `width` / `height`）。
- **默认 `pointer-events: none`**，不拦截后续若接入的 DOM 指针或程序化命中实验。
- **不要求** `img`、真实文本排版或与 Skia 像素对齐；若未来升级到「低保真预览」，另开规格扩展 **节点类型与绘制属性**。

---

## 3. 架构决策摘要

| 主题           | 决策                                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 接口与订阅位置 | **`core-v2`**：增加 **布局完成后** 的订阅 API；导出 **只读帧载荷类型**（见 §4）。**不依赖** React/DOM。                                                         |
| DOM 实现位置   | **`react-v2`**：提供调试叠加组件（名称实现时拟定，如 `DebugDomLayer`），依赖 `SceneRuntime` 或等价窄接口。                                                      |
| Skia 占位位置  | 与 DOM 并列：**同包或同目录下** 导出占位模块（如 `skia-renderer.stub.ts`），第一版 **no-op 或显式未实现**，不得在静默中假装已绘制。                             |
| 独立包         | **第一版不新增** `render-v2` 包；若后续 Skia 与 DOM 体量过大，可再拆包（YAGNI）。                                                                               |
| 刷新模型       | **优先** 由 `subscribeAfterLayout` **推送** 刷新 DOM 层；`apps/v2` 中现有 **轮询式** `LayoutPreview` 可改为使用订阅或保留为兜底（实现计划中二选一并整仓一致）。 |

---

## 4. `core-v2` API 与类型

### 4.1 `SceneRuntime` 增量

- **`subscribeAfterLayout(listener): () => void`**
  - 在内部每次完成 **与场景变更相关的布局同步**（即当前 `runLayout()` / `calculateAndSyncLayout` 路径）后调用 `listener`。
  - `listener` 应为同步、轻量；**禁止**要求 core 等待异步。
  - 多次连续树变更可合并为一次布局：**至少**在最终布局完成后调用一次（实现可一次变更一次回调，须文档化）。
  - 返回 **取消订阅** 函数。

### 4.2 帧载荷类型（名称实现时可微调）

导出例如 **`LayoutCommitPayload`**（或 `DebugFramePayload`），建议字段：

- `viewport: { width: number; height: number }`
- `rootId: string`
- `layout: LayoutSnapshot`（与现有 `getLayoutSnapshot()` 结构一致）
- `scene: SceneGraphSnapshot`（与现有 `getSceneGraphSnapshot()` 结构一致）

**推荐**：在调用 `listener` 时由 **runtime 组装并传入 `LayoutCommitPayload`**，避免 listener 内先读后读产生竞态。

若第一版仅传入 `void` 并由监听方自行调用 `getLayoutSnapshot()`，须在规格中注明 **同一次布局提交内快照一致**；**推荐直接传 payload**。

### 4.3 导出

- `packages/core-v2/src/index.ts` 导出新增类型与 `createSceneRuntime` 上已存在的 `SceneRuntime` 类型扩展。

---

## 5. `react-v2`：DOM 调试叠加层

### 5.1 组件职责

- **输入**：`SceneRuntime`（或仅含 `subscribeAfterLayout` + 读快照的 **窄类型**，便于测试 mock）。
- **输出**：在 **与画布/根视口对齐** 的容器内，渲染 **绝对定位** 的调试盒列表；**不修改** core 状态。
- **样式**：与 `apps/v2` 现有 `layout-preview.tsx` 类似——**框线、半透明填充、节点 id 标签**；可抽取复用 hue 哈希等纯展示逻辑。

### 5.2 与 `CanvasRuntime` 关系

- **推荐**：作为 `CanvasRuntime` 的 **可选子节点** 或 **可选 prop**（如 `debugOverlay?: boolean`），避免应用层重复传 `runtime`；具体形态由实现计划定稿，本规格只要求 **单一入口、易发现**。

---

## 6. Skia 后端（占位）

- 导出 **`SkiaSceneRenderer`** 或等价 **接口名** + **`createSkiaSceneRenderer(...)`** 工厂（参数可为 `viewport` + 未来扩展）。
- **第一版行为**：不加载 WASM；`render` / `frame` 类方法可为 **no-op**，或在 **开发环境** 对 `console.warn` 一次 **「未实现」**（二选一整仓一致，禁止静默成功）。
- **文档**：在本规格与代码注释中写明 **下一里程碑** 为接入 CanvasKit 与真实 draw list。

---

## 7. `apps/v2`

- 接入 DOM 调试层后，**优先** 移除或降级 **仅用于布局预览的轮询**（`LayoutPreview` 的 `setInterval`），避免双份刷新。
- 冒烟页继续展示 JSON 调试块；不增加业务依赖。

---

## 8. 测试策略

| 层级         | 内容                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **core-v2**  | `subscribeAfterLayout`：在 `insertView` / `updateStyle` / `removeView` 等触发布局后 **至少触发一次**；可用计数或 spy。 |
| **react-v2** | 调试层组件 **mount 不抛错**；可选：mock runtime，断言订阅后渲染子项数量与快照节点数一致（轻量）。                      |
| **apps/v2**  | 手工冒烟；逻辑仍以包内测试为主。                                                                                       |

门禁：相关包 **`vp check`**、**`vp test`** 通过（与仓库 `AGENTS.md` 一致）。

---

## 9. 与 `2026-04-10-v2-scene-yoga-events-design.md` 的关系

- 事件与命中语义 **仍以该文档为准**。
- 该文档 §7 **排除项** 中「任何 Skia / Canvas2D / 位图绘制」仍指 **core 正式像素管线**；**允许** 本规格所述的 **DOM 调试叠加**（非 `SceneRuntime` 内绘制）。
- 若实现时发现措辞冲突，**以本规格对「渲染子系统」的界定为准**，并回写该文档修订记录。

---

## 10. 修订记录

| 日期       | 说明                                                        |
| ---------- | ----------------------------------------------------------- |
| 2026-04-10 | 初稿：brainstorming 确认（方案 1 + DOM 调试 A + Skia 占位） |
