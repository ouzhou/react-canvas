# Pointer move、enter/leave（A）、`layoutDirty` 与 View `style({ hovered })` Implementation Plan

> **规格依据：** [`docs/superpowers/specs/2026-04-11-pointer-move-hover-design.md`](../specs/2026-04-11-pointer-move-hover-design.md)

**Goal：** 在 `packages/core-v2` 扩展指针类型与派发（`pointermove` / `pointerenter` / `pointerleave`）、内部 `lastHitTargetId`、**`layoutDirty`** 且干净路径跳过 `calculateAndSyncLayout`、画布 **rAF 合并 move**；在 `packages/react-v2` 支持 **`style` 为函数** `({ hovered }) => ViewStyle`；测试与 README 同步。

**非目标（本期）：** `pressed`、`pointercancel`（可另 PR）、空间索引、改变 `pointermove` 的 capture/bubble 模型。

---

## Review 结论（spec）

- 目标与性能（`layoutDirty` 与功能同期）一致；无对外 `hoverTargetId` 要求。
- **实现时需定稿：** §2.3「`pointermove` 每帧是否必发」——建议：**每轮 rAF 合并后，若存在当前命中叶子且（可选）该路径上有 `pointermove` 监听则派发**；无叶子不派发。写入 README。
- **注意：** `getLayoutSnapshot()` 若内部调用 `runLayout()`，须与 **`layoutDirty`** 语义一致，避免绕过「干净」状态（任务内核对 `scene-runtime.ts`）。

---

## Task 1：`layoutDirty` 与 `dispatchPointerLike`

**Files：** `packages/core-v2/src/runtime/scene-runtime.ts`、`packages/core-v2/src/events/dispatch.ts`

- [ ] 在 `SceneRuntime` 内部（或 `dispatch` 可读的上下文）维护 **`layoutDirty: boolean`**。
- [ ] **置脏**：`insertView`、`removeView`、`updateStyle`、以及 **视口尺寸变更**（若 API 存在；否则仅前三者 + 创建 runtime 初始状态）。
- [ ] **`dispatchPointerLike` 开头**：若 **`layoutDirty`** → `calculateAndSyncLayout(...)` → **清脏**；若 **不脏** → **跳过** `calculateAndSyncLayout`，直接 `hitTestAt`（依赖已有 `node.layout`）。
- [ ] 保证 **首次指针派发前** 至少有一次有效布局（创建 runtime 时已 `runLayout` 或初始 `layoutDirty=true`）。
- [ ] 核对 **`getLayoutSnapshot`** / **`insertView` 结束态**：突变后布局已最新时，**脏标记**与 **`dispatch`** 跳过逻辑一致。

**验证：** `vp test packages/core-v2`；新增测试：**连续多次**仅 `dispatchPointerLike({ type: 'pointerdown', ... })` 且树未变时，`calculateLayout` 调用次数符合预期（可 spy 或计数 wrapper，若测试环境允许）。

---

## Task 2：事件类型与合成 enter/leave（A）

**Files：** `packages/core-v2/src/events/scene-event.ts`、`packages/core-v2/src/events/dispatch.ts`、`packages/core-v2/src/runtime/scene-runtime.ts`、`packages/core-v2/src/index.ts`

- [ ] 扩展 **`PointerEventType`**：`pointermove` | `pointerenter` | `pointerleave`。
- [ ] 在 **runtime** 内维护 **`lastHitTargetId: string | null`**（仅内部）。
- [ ] 新增 **内部流程**（可挂在 `dispatchPointerLike` 之后或专用函数）：对 **指针类**输入，在得到 **`nextLeafId = hitTestAt(...)`** 后：
  - 若 **`prev !== next`**：先对 **`prev`** 派发 **`pointerleave`**（若 `prev` 非 null），再对 **`next`** 派发 **`pointerenter`**（若 `next` 非 null）；均走现有 **capture/bubble** 与 **`ScenePointerEvent`**。
  - 更新 **`lastHitTargetId = next`**。
- [ ] **`pointermove` / `pointerdown` / `pointerup` / `click`**：在合成 enter/leave **之后或按约定顺序**派发主事件（建议顺序：**leave → enter → move** 或与 spec 小组对齐，**同一 rAF 批内**文档化）。
- [ ] **方案 A**：**不**为祖先单独发 enter/leave。

**验证：** 单测：`prev`→`next` 变化时仅两叶收到 leave/enter；`prev===next` 时无 enter/leave。

---

## Task 3：画布 `pointermove` + rAF

**Files：** `packages/core-v2/src/input/canvas-stage-pointer.ts`

- [ ] `canvas.addEventListener('pointermove', ...)`，**`passive: true`**（若环境支持）。
- [ ] **rAF 合并**：同一帧内仅 **一次**调用 runtime 的 move 管线（最后一次坐标）；与 Task 2 的命中 + 合成逻辑衔接。
- [ ] **离开画布**：`pointerleave`（canvas）或 **`document` 级** `pointerup`/`pointercancel`** 等**在 spec §2.2 允许的范围内，将 **`lastHitTargetId` 清空**并补 **`pointerleave`**（旧叶非 null 时）。最小实现即可。

**验证：** 单测或手测：同帧多 move 仅一次命中管线（可 mock rAF）。

---

## Task 4：`SceneRuntime` API 与导出

**Files：** `packages/core-v2/src/runtime/scene-runtime.ts`、`packages/core-v2/src/index.ts`

- [ ] `addListener` 支持新类型；**不**导出 `getHoverTargetId`。
- [ ] `getLastDispatchTrace` 仍可用于测试。

---

## Task 5：react-v2 `View` 与 `style({ hovered })`

**Files：** `packages/react-v2/src/view.tsx`、`packages/react-v2/src/index.ts`

- [ ] `ViewProps['style']`：**`ViewStyle | ((s: { hovered: boolean }) => ViewStyle)`**。
- [ ] 内部 **`hovered` state**（或 ref），由 **`pointerenter` / `pointerleave`** 在 **本 `nodeId`** 上更新。
- [ ] **解析**：`resolved = typeof style === 'function' ? style({ hovered }) : style`；**`insertView` / `updateStyle`** 使用 **`resolved`**。
- [ ] **稳定 `style` 函数**：文档或注释建议 **`useCallback`**；effect 依赖 **`style`** 时，**函数引用变化**需重新挂载样式逻辑（与 §4 一致）。
- [ ] 仅在 **`hovered` 变化**或 **静态 style / 函数引用策略**要求时更新 runtime（避免每帧无意义 `updateStyle`）。

**验证：** `packages/react-v2/tests` 新增用例：hover 切换时样式层变化。

---

## Task 6：文档与示例

- [ ] `packages/core-v2/README.md`：新事件、A 语义、`layoutDirty` 行为、与 DOM 差异；无 hover getter。
- [ ] `packages/react-v2/README.md`：函数 `style` + `hovered` + `useCallback` 建议。
- [ ] （可选）`apps/v2` 最小交互：一按钮函数 `style` 演示 hover。

---

## Task 7：全局验证

```bash
cd /Users/zhouou/Desktop/react-canvas && vp check && vp test packages/core-v2 && vp test packages/react-v2
```

- [ ] 全部通过。

---

## 依赖顺序建议

1. Task 1（`layoutDirty`）— 其余派发都依赖正确布局跳过。
2. Task 2 + 3（类型、合成、画布 move）— 可紧密衔接。
3. Task 4（导出整理）。
4. Task 5（react-v2）。
5. Task 6–7。
