# @react-canvas/plugin-inspector

画布内 **元素检视**：鼠标悬停描边、**双击**将当前高亮节点压入「作用域栈」以在子树内继续选层（类似 Figma 钻入）、**Esc** 弹出栈。

## 依赖

- `attachCanvasPointerHandlers`（`@react-canvas/react`）与 `getCanvasFrame` 已注册同一 `<canvas>` 时，`hitTest` 与帧数据一致。
- 与 `@react-canvas/plugin-viewport` 并存：**Cmd/Ctrl + 左键拖拽平移**时不更新悬停高亮。

## 限制

- `getWorldBounds` 与 `ScrollView` 滚动内容的屏幕对齐在部分滚动偏移下可能略有偏差（与 core 现有世界坐标语义一致）。

## API

- `attachInspectorHandlers(canvas, { logicalWidth, logicalHeight, onStateChange })`
- `<InspectorHighlight canvasRef node logicalWidth logicalHeight cameraRevision />`：`cameraRevision` 传与 `<Canvas camera={…}>` 相同引用或对象，便于平移/缩放后重算 DOM 描边。
