# `@react-canvas/react-v2`

## 运行时初始化（`docs/core-design.md` §2.3）

`CanvasProvider` 在 `useEffect` 中调用 `initRuntime()`，并用 `useSyncExternalStore(subscribeRuntimeInit, getRuntimeSnapshot, getRuntimeServerSnapshot)` 订阅 **`@react-canvas/core-v2`** 模块级快照（`idle` / `loading` / `ready` / `error`）。

子函数渲染参数：`snapshot`、`isReady`、`runtime`（就绪时为 `{ yoga, canvasKit }`）。`initOptions` 仅首次挂载时传入 `initRuntime`（与 §2.2「首次 options 生效」一致）。

详见 `packages/core-v2` 的 `init-runtime.ts` 与根目录 `README`。

## `View` 与 `style`

- **`style`** 可为 **`ViewStyle` 对象**，或 **函数** `({ hovered }) => ViewStyle`。`hovered` 由场景 **`pointerenter` / `pointerleave`**（经 `SceneRuntime` 合成）驱动。
- **心智模型：引用 ≠ 样式。** 每次 render 写 `style={{ ... }}` 或新的内联 `style={() => ...}` 都会换引用；`View` 与场景对齐时用的是 **解析后样式的 JSON 快照**（内容相同则不必也不应担心「新对象/新函数」）。因此一般**不需要**为 `style` 包 **`useCallback` / `useMemo`**。
- **Hover 监听**只在「静态对象 ↔ 函数」之间切换时重挂，不因函数引用每帧变化而重复注册。
- 若样式对象极大、单帧 `JSON.stringify` 可测得开销，再在父组件对**大对象**自行 `useMemo` 即可。

## 测试

Vitest 中对 `CanvasProvider` 或 `initRuntime` 做用例间隔离时，可调用 **`resetRuntimeInitForTests()`**（由 `core-v2` 导出）。`tests/canvas-provider.test.tsx` 验证 **多个 `CanvasProvider` 挂载后 `runtime` 引用相同**（共享模块级状态）。
