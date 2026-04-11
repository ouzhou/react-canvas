# `@react-canvas/react-v2`

## 运行时初始化（`docs/core-design.md` §2.3）

`CanvasProvider` 在 `useEffect` 中调用 `initRuntime()`，并用 `useSyncExternalStore(subscribeRuntimeInit, getRuntimeSnapshot, getRuntimeServerSnapshot)` 订阅 **`@react-canvas/core-v2`** 模块级快照（`idle` / `loading` / `ready` / `error`）。

子函数渲染参数：`snapshot`、`isReady`、`runtime`（就绪时为 `{ yoga, canvasKit }`）。`initOptions` 仅首次挂载时传入 `initRuntime`（与 §2.2「首次 options 生效」一致）。

详见 `packages/core-v2` 的 `init-runtime.ts` 与根目录 `README`。

## 测试

Vitest 中对 `CanvasProvider` 或 `initRuntime` 做用例间隔离时，可调用 **`resetRuntimeInitForTests()`**（由 `core-v2` 导出）。`tests/canvas-provider.test.tsx` 验证 **多个 `CanvasProvider` 挂载后 `runtime` 引用相同**（共享模块级状态）。
