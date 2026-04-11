# 实现计划：`ViewStyle.cursor`（仅节点层）

依据：`docs/superpowers/specs/2026-04-11-view-style-cursor-design.md`

## 已完成项

1. **`ViewStyle.cursor?: string`**（`style-map.ts`），不进入 Yoga。
2. **`resolveCursorFromHitLeaf`**（`input/resolve-cursor.ts`）+ 单测 `resolve-cursor.test.ts`。
3. **`bindSceneRuntimeCursorTarget` + `applyResolvedCursor`**（`scene-runtime.ts`）：enter/leave 与 `lastHitTargetId` 更新之后、`pointermove`/空命中 early return 之前调用 `applyResolvedCursor`；`notifyPointerLeftStage` 末尾调用。
4. **`attachCanvasStagePointer`** 挂载/卸载时 `bindSceneRuntimeCursorTarget(runtime, canvas | null)`。
5. **集成测** `scene-runtime-cursor.test.ts`（假 `canvas` 对象）。
6. **演示**：`react-smoke` 命中 demo 区域增加 `cursor: "pointer"`（可选）。

## 待你本地验收

- `vp check` / `vp test`
- 浏览器打开 apps/v2，指针移入红块手型、移出恢复

## 非目标（本期）

- 插件/系统优先级栈、`CursorManager` 全量 API。
