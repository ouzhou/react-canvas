# @react-canvas/plugin-keyboard

在浏览器中监听 `keydown` / `keyup`，维护当前按下的 `event.code` 集合。不修改 React Canvas 场景树，可与 `@react-canvas/plugin-viewport`（Space + 拖拽平移）等组合使用。

## API

- **`useKeyboardMonitor(target?)`**
  - `target`：监听目标，默认 `window`；传 `document` 或 `null`（`null` 时不注册监听）。
  - 返回：
    - **`pressedKeys`**：`ReadonlySet<string>`，当前按下的键的 `code`（如 `"Space"`、`"KeyA"`）。
    - **`isKeyDown(code)`**：查询某 `code` 是否按下。

卸载组件或 `target` 变为 `null` 时会移除监听器；窗口 `blur` 时会清空集合（避免切换标签后状态残留）。

## 使用

```tsx
import { useKeyboardMonitor } from "@react-canvas/plugin-keyboard";

function Example() {
  const { isKeyDown } = useKeyboardMonitor();
  const space = isKeyDown("Space");
  // ...
}
```

## Peer

- `react` ^19.2.0
