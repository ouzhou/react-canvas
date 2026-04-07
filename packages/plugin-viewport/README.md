# @react-canvas/plugin-viewport

视口平移与缩放（DOM 层）：**Cmd（macOS）/ Ctrl（Windows）+ 滚轮** 缩放；**同一组修饰键 + 左键拖拽** 平移。松开修饰键后不再缩放、不再平移（拖拽中途松键会结束平移）。状态由应用持有，通过根 `View` 的 `style.transform` 作用于场景。

## 与 `@react-canvas/react` 的配合

- `attachCanvasPointerHandlers` 已对 **带 Cmd/Ctrl 的滚轮** 在 `ScrollView` 分支 **提前 return**，避免列表抢走修饰键滚轮。
- 本包在 **同一 `<canvas>`** 上注册 `wheel`（仅处理修饰键）与 **capture 阶段** `pointerdown`（Cmd/Ctrl+左键），可与 `attachCanvasPointerHandlers` **同时存在**。

## 根 `View` 绑定示例

将 `ViewportState` 映射到 `<Canvas>` 内**唯一根** `View` 的 `transform`（顺序与 Yoga/Skia 管线一致；若视觉相反可调整数组顺序）：

```tsx
import type { ViewportState } from "@react-canvas/plugin-viewport";

function viewportToTransform(state: ViewportState) {
  return [
    { translateX: state.translateX, translateY: state.translateY },
    { scale: state.scale },
  ] as const;
}
```

`hitTest` 使用与绘制相同的 `transform` 世界矩阵时，首版一般 **无需** 再对指针坐标做额外逆变换；若集成后出现偏移，再考虑在 `attachCanvasPointerHandlers` 侧增加可选映射。

## API

- **`useViewportState(initial?)`**：`useState` 包装，默认 `DEFAULT_VIEWPORT`。
- **`attachViewportHandlers(canvas, options)`**：注册事件；返回 **`detach`**，须在卸载时调用。
  - `logicalWidth` / `logicalHeight`：与 `<Canvas width={…} height={…}>` 一致。
  - `setState`：与 `useViewportState` 返回的 setter 相同。

## Peer

- `react` ^19.2.0
- `@react-canvas/react`（workspace 或兼容版本）
