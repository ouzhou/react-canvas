# `docs/core-design.md` ↔ `packages/core` ↔ `apps/core-test` 核对

本页说明设计文档章节与 **core 公开 API**、**core-test 可视化 demo** 的对应关系，便于手动验收。

| core-design 章节 | 能力要点                                     | core 出口（主要）                                                                                  | core-test Demo                  |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------- |
| §2 Runtime       | WASM 初始化、`initRuntime`、快照             | `initRuntime`, `getRuntimeSnapshot`                                                                | **Runtime 状态**                |
| §3 Stage         | Surface、尺寸、`destroy`、`getNodeWorldRect` | `Stage`, `StageOptions`                                                                            | 所有基于 Stage 的 tab           |
| §4 Layer         | default / overlay / modal、`zIndex`          | `Layer`, `defaultLayer`, `overlayLayer`, `modalLayer`                                              | **多 Layer 叠加**               |
| §5 节点          | View / Text / Image / ScrollView / SvgPath   | `ViewNode`, `TextNode`, `ImageNode`, `ScrollViewNode`, `SvgPathNode`                               | Flex / 文字 / 图片 / 滚动 / SVG |
| §6–7 布局与绘制  | Yoga、`paintScene` / `paintStageLayers`      | `queueLayoutPaintFrame`, `paintStageLayers`（内部）                                                | 全部绘制类 demo                 |
| §8 事件          | 命中、冒泡、合成 click、指针捕获             | `hitTest`, `dispatchBubble`, `attachCanvasPointerHandlers`, `Stage.setPointerCapture`              | **点击命中**（完整指针管线）    |
| §9 动画          | `Ticker`、`createTicker`                     | `Ticker`, `Stage.createTicker`                                                                     | **动画**                        |
| §10 帧调度       | `requestLayoutPaint`、每 Stage 调度器        | `Stage.requestLayoutPaint`, `Stage.getFrameScheduler`, `createAndBindFrameScheduler`               | 全部                            |
| §11 相机         | `ViewportCamera`                             | `ViewportCamera`, `logicalPointFromCameraViewport`                                                 | **视口相机**                    |
| §12 包边界       | 纯 JS 可用                                   | 本 app 仅依赖 `@react-canvas/core`                                                                 | 全局                            |
| §14 交互态       | 焦点、`hovered`/`pressed`/`focused`          | `Stage.focusManager`, `ViewNode.interactionState`, `CanvasPointerInteractionBinding`               | （可后续加 tab）                |
| §15 光标         | 优先级栈 `node` < `plugin` < `system`        | `Stage.cursorManager`, `CursorManager.set` / `setFromNode` / `resolve`, `resolveCursorFromHitLeaf` | （可后续加 tab）                |

**尚未单独做可视化、或仅在文档中的能力**（可在后续加 tab）：嵌套滚动链 §17、插件 §18 等。

**说明**：Image 异步解码在节点已挂在某 `Layer` 下时走 `Stage.requestPaintOnly()`（经 `getStageFromViewNode`）；未挂载时仍回退 `requestRedrawFromImage`（见 **图片** demo）。
