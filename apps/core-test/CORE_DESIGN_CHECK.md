# `docs/core-design.md` ↔ `packages/core` ↔ `apps/core-test` 核对

本页说明设计文档章节与 **core 公开 API**、**core-test 可视化 demo** 的对应关系。侧栏顺序与文档「目录」§1–§18 一致（有 demo 的章节）。

| 章节（目录）     | 能力要点                          | core 出口（主要）                               | core-test `demo` 参数 / 挂载                                     |
| ---------------- | --------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| §1 整体架构      | 分层、RN→core 对应                | 概念                                            | `architecture` · `demo-architecture.ts`                          |
| §2 Runtime       | WASM、`initRuntime`               | `initRuntime`, `getRuntimeSnapshot`             | `runtime`                                                        |
| §3 Stage         | Surface、相机、`getNodeWorldRect` | `Stage`, `ViewportCamera`, `resize`             | `stage` · `demo-stage.ts`                                        |
| §4 Layer         | 弹窗 / modal、多 Layer 命中       | `defaultLayer`, `overlayLayer`, `modalLayer`    | `layers` · modal 遮罩 + 对话框                                   |
| §5 节点模型      | View/Text/Image/SvgPath           | 各 `*Node`                                      | `nodes` · `demo-node-model.ts`                                   |
| §6 布局引擎      | Yoga、Flex、absolute              | `applyStylesToYoga` 等                          | `layout` · `demo-layout-engine.ts`                               |
| §7 渲染管线      | paint、zIndex、opacity            | `paintScene`, `paintStageLayers`                | `render` · `demo-opacity-zindex.ts`（`mountRenderPipelineDemo`） |
| §8 事件系统      | 命中、冒泡                        | `attachCanvasPointerHandlers`, `dispatchBubble` | `events` · `demo-events.ts`                                      |
| §9 动画          | Ticker                            | `Stage.createTicker`                            | `anim`                                                           |
| §10 帧调度器     | layout/paint 帧                   | `requestLayoutPaint`, `requestPaintOnly`        | `frame`                                                          |
| §11 独立使用 API | 无 React                          | 文档 §11 示例                                   | `standalone`                                                     |
| §12 包边界       | 仅 core                           | 本 app 依赖                                     | `package` · `demo-package-boundary.ts`                           |
| §13 待决问题     | 设计债                            | 文档 §13                                        | `pending` · `demo-pending-issues.ts`                             |
| §14 伪类模拟     | interactionState                  | `FocusManager` 等                               | `focus`                                                          |
| §15 光标管理     | CursorManager                     | `cursorManager`                                 | `cursor`                                                         |
| §16 Overflow     | clip、圆角                        | `ViewStyle`                                     | `overflow`                                                       |
| §17 嵌套滚动     | ScrollView 链                     | `ScrollViewNode`, `applyWheelToScrollViewChain` | `scroll`                                                         |
| §18 插件系统     | Plugin                            | `Stage.use`, `PluginContext`                    | `plugin`                                                         |

**旧 URL**：`?demo=flex|text|image|svg|camera|zindex|pointer` 会映射到 `layout` / `nodes` / `stage` / `render` / `events`。

**说明**：Image 解码完成后由 `Stage.requestLayoutPaint` / `requestPaintOnly` 驱动重绘（见 **nodes** demo）。
