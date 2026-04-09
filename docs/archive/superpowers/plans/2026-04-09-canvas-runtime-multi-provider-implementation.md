# Canvas 运行时与多 `CanvasProvider` — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@react-canvas/core` 中集中「运行时初始化」状态与订阅接口，在 `@react-canvas/react` 的 `CanvasProvider` 中用 `useSyncExternalStore` 订阅；落实规格 §4 的字体选项冲突语义（首次调用为准 + 可选 dev warn）；补充测试与文档，**不破坏**现有 `CanvasProvider` / `initCanvasRuntime` 的对外用法。

**Architecture:** `runtime.ts` 中的单例 Promise 逻辑迁入（或委托给）新模块 `runtime-init-store.ts`：对外提供 `subscribeCanvasRuntimeInit`、`getCanvasRuntimeInitSnapshot`、`getCanvasRuntimeInitServerSnapshot`，供 React `useSyncExternalStore` 使用；`initCanvasRuntime(options)` 仍返回 `Promise<CanvasRuntime>`，内部与 store 共用同一条初始化管线。字体选项用规范化 **fingerprint** 比较；**第一次**调用 `initCanvasRuntime` 时记录的 fingerprint 为生效值，后续冲突时 dev 下 `console.warn` 至多一次（可模块级 `let warned = false`）。可选导出 `preloadCanvasRuntime` 作为 `initCanvasRuntime` 的别名。

**Tech Stack:** TypeScript、`@react-canvas/core`、`@react-canvas/react`、React 18 `useSyncExternalStore`、Vitest（`vite-plus/test`）、Vite+（`vp test` / `vp check`）。

**规格依据：** [docs/superpowers/specs/2026-04-09-canvas-runtime-multi-provider-design.md](../specs/2026-04-09-canvas-runtime-multi-provider-design.md)

---

## 文件结构（将创建 / 修改）

| 文件                                                                                | 职责                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/runtime/runtime-init-store.ts`                                   | **新建**：初始化状态机、订阅、`getSnapshot`/`getServerSnapshot`、首次字体 fingerprint、冲突检测与 dev warn                                                                                                                                                     |
| `packages/core/src/runtime/runtime.ts`                                              | **修改**：`initCanvasRuntime` 委托 store；保留或迁移 `yogaInitPromise` / `canvasKitInitPromise`（避免重复：要么保留在 `runtime.ts` 仅由 store 调用的私有 getter，要么完全迁入 store 并删除模块级变量——计划采用 **store 内聚单例 Promise**，`runtime.ts` 变薄） |
| `packages/core/src/index.ts`                                                        | **修改**：导出 store 的公开 API 与类型（名称见 Task 1）                                                                                                                                                                                                        |
| `packages/react/src/canvas/canvas-provider.tsx`                                     | **修改**：用 `useSyncExternalStore` + 可选 `useEffect`（仅用于冲突 warn 若放在 React 层；若 warn 全在 core，则 Provider 只订阅）                                                                                                                               |
| `packages/react/src/canvas/use-canvas-runtime-init.ts`（可选）                      | **新建**：若希望 Provider 文件保持短小，抽出 `useCanvasRuntimeInit(runtimeOptions)`                                                                                                                                                                            |
| `packages/react/tests/canvas/canvas-multi-provider.test.tsx`                        | **新建**：多 Provider、引用相等、冲突不抛错、warn 行为                                                                                                                                                                                                         |
| `packages/core/tests/runtime/runtime-init-store.test.ts`                            | **可选**：若可对 fingerprint / warn 逻辑做纯单元测试（不加载 WASM），则加；否则依赖 react 集成测试                                                                                                                                                             |
| `apps/website/src/content/docs/playground/multi-canvas.mdx`                         | **修改**：措辞「建议」                                                                                                                                                                                                                                         |
| `apps/website/src/components/MultiCanvasPlayground.tsx`                             | **修改**：若有「必须」类 copy，改为建议                                                                                                                                                                                                                        |
| `apps/website/src/content/docs/guides/runtime-layout.mdx` 或 `intro/quickstart.mdx` | **修改**：「多 Provider」小节 + 链到规格                                                                                                                                                                                                                       |

---

### Task 1: Core — `runtime-init-store` 与 `initCanvasRuntime` 重构

**Files:**

- Create: `packages/core/src/runtime/runtime-init-store.ts`
- Modify: `packages/core/src/runtime/runtime.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 实现 fingerprint 与类型**

在 `runtime-init-store.ts` 中定义（名称可微调，但需与导出一致）：

```typescript
import type { CanvasRuntime, InitCanvasRuntimeOptions } from "./runtime.ts";

/** 与 InitCanvasRuntimeOptions 中字体相关字段对应；用于 §4 冲突比较 */
export function getFontOptionsFingerprint(options?: InitCanvasRuntimeOptions): string {
  const load = options?.loadDefaultParagraphFonts !== false;
  const url = options?.defaultParagraphFontUrl ?? "";
  return `${load}:${url}`;
}

export type CanvasRuntimeInitSnapshot =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; runtime: CanvasRuntime }
  | { status: "error"; error: Error };
```

- [ ] **Step 2: 实现订阅与快照（无 React）**

- 模块级：`let snapshot: CanvasRuntimeInitSnapshot = { status: "idle" }`；`let listeners = new Set<() => void>()`；`function emit()` 更新 snapshot 并遍历 `listeners`。
- `export function subscribeCanvasRuntimeInit(onChange: () => void): () => void`：加入 `listeners`，返回 unsubscribe。
- `export function getCanvasRuntimeInitSnapshot(): CanvasRuntimeInitSnapshot`：返回当前 `snapshot`。
- `export function getCanvasRuntimeInitServerSnapshot(): CanvasRuntimeInitSnapshot`：返回 `{ status: "idle" }`（文档：SSR/服务端无 WASM，与「未开始初始化」一致）。

- [ ] **Step 3: 单例初始化管线**

- 将 `runtime.ts` 中的 `yogaInitPromise`、`canvasKitInitPromise` **迁入**本文件（或保留私有 `getYogaSingleton` / `getCanvasKitSingleton` 仅在此文件内），避免两处重复。
- `let initPromise: Promise<CanvasRuntime> | null = null`。
- `let committedFontFingerprint: string | null = null`（首次 **发起** `initCanvasRuntime` 时锁定 fingerprint，见规格：以首次调用为准；若需与「首次成功完成」严格一致，可改为在 `then` 成功后再提交 fingerprint——**推荐与规格 §4.1 一致：在首次 `initCanvasRuntime` 调用时记录 `requestedFingerprint`，成功后将 `committedFontFingerprint = requestedFingerprint`**；后续调用若 `getFontOptionsFingerprint(opts) !== committedFontFingerprint` 且初始化已成功，则 `warnOnce`）。
- `function warnOnce(message: string)`：`if (import.meta.env?.DEV !== false && typeof console !== "undefined")` 用模块级 `let didWarnConflict = false`，仅一次。
- `export function initCanvasRuntime(options?: InitCanvasRuntimeOptions): Promise<CanvasRuntime>`：
  - 若尚无 `initPromise`：设 `snapshot = { status: "loading" }`，`emit()`，记录本次 `requestedFingerprint`，创建 `initPromise = Promise.all([getYogaSingleton(), getCanvasKitSingleton(), font branch]).then(...)`，与现有 `runtime.ts` 逻辑等价；成功则 `snapshot = { status: "ready", runtime: { yoga, canvasKit } }`，失败则 `snapshot = { status: "error", error }`；`emit()`。
  - 若已有 `initPromise`：若 `getFontOptionsFingerprint(options) !== committedFontFingerprint` 且 snapshot 已为 `ready`，调用 `warnOnce`；**始终 `return initPromise`**（同一 Promise，满足「不抛错、不二次纠正字体」）。

**注意：** 首次调用时必须设置 `committedFontFingerprint`（在启动 pipeline 前设为第一次请求的 fingerprint），这样后续调用可比较。

- [ ] **Step 4: 精简 `runtime.ts`**

- `runtime.ts` **仅** re-export：`export { initCanvasRuntime, type CanvasRuntime, type InitCanvasRuntimeOptions } from "./runtime-init-store.ts"`，或保留 `InitCanvasRuntimeOptions` 类型定义在 `runtime.ts` 而实现走 store——**二选一避免循环依赖**：若类型在 `runtime.ts`，则 `runtime-init-store.ts` `import type` from `runtime.ts`；`runtime.ts` import 实现自 `runtime-init-store.ts`。**禁止** `runtime-init-store.ts` 与 `runtime.ts` 相互值导入形成环。

推荐：**类型 `InitCanvasRuntimeOptions` 与 `CanvasRuntime` 留在 `runtime.ts`**（或单独 `runtime-types.ts`），`runtime-init-store.ts` 从 `runtime-types` 或 `runtime.ts` 仅 `import type`；`initCanvasRuntime` 实现放在 `runtime-init-store.ts`，`runtime.ts` 再 `export { initCanvasRuntime } from "./runtime-init-store.ts"`。

- [ ] **Step 5: 更新 `packages/core/src/index.ts`**

导出：

```typescript
export {
  initCanvasRuntime,
  subscribeCanvasRuntimeInit,
  getCanvasRuntimeInitSnapshot,
  getCanvasRuntimeInitServerSnapshot,
  getFontOptionsFingerprint,
  type CanvasRuntimeInitSnapshot,
} from "./runtime/runtime-init-store.ts"; // 路径以实际为准
export type { CanvasRuntime, InitCanvasRuntimeOptions } from "./runtime/runtime.ts";
```

若 `initCanvasRuntime` 仅从 store 导出，避免重复导出两次。

- [ ] **Step 6: 运行检查**

```bash
cd /path/to/react-canvas && vp check
```

Expected: pass.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/runtime/runtime-init-store.ts packages/core/src/runtime/runtime.ts packages/core/src/index.ts
git commit -m "feat(core): centralize canvas runtime init with subscribe API"
```

---

### Task 2: React — `CanvasProvider` 使用 `useSyncExternalStore`

**Files:**

- Modify: `packages/react/src/canvas/canvas-provider.tsx`
- Optional create: `packages/react/src/canvas/use-canvas-runtime-init.ts`
- Modify: `packages/react/src/index.ts`（若需导出 hook；规格未要求对外导出 hook，可 **仅内部使用**）

- [ ] **Step 1: 在 `canvas-provider.tsx` 中接入**

```tsx
import { useSyncExternalStore } from "react";
import {
  subscribeCanvasRuntimeInit,
  getCanvasRuntimeInitSnapshot,
  getCanvasRuntimeInitServerSnapshot,
  initCanvasRuntime,
  type InitCanvasRuntimeOptions,
} from "@react-canvas/core";
```

- `useEffect`（或同步 layout）**首次**根据 `runtimeOptions` 调用 `void initCanvasRuntime(runtimeOptions)` 以确保 pipeline 启动（若 `initCanvasRuntime` 在首次调用时已启动，重复调用安全）。
- `const snap = useSyncExternalStore(subscribeCanvasRuntimeInit, getCanvasRuntimeInitSnapshot, getCanvasRuntimeInitServerSnapshot);`
- 由 `snap` 推导 `isReady`、`error`：`snap.status === "ready"` → `isReady: true`，`error: null`；`snap.status === "error"` → `error: snap.error`；`idle`/`loading` → `isReady: false`。
- `CanvasRuntimeContext.Provider` 的 `value`：`snap.status === "ready" ? { yoga: snap.runtime.yoga, canvasKit: snap.runtime.canvasKit } : null`（与现有一致）。

- [ ] **Step 2: 移除** 原先仅用于 `yoga`/`canvasKit` 本地 `useState` + `useEffect` 中 `initCanvasRuntime` 的 then/catch（已由 store 统一）。

- [ ] **Step 3: `vp check`**

```bash
vp check
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add packages/react/src/canvas/canvas-provider.tsx
git commit -m "feat(react): CanvasProvider subscribes to core runtime init store"
```

---

### Task 3: 测试 — 多 Provider、引用一致、冲突

**Files:**

- Create: `packages/react/tests/canvas/canvas-multi-provider.test.tsx`

- [ ] **Step 1: 双 Provider 就绪且 `yoga`/`canvasKit` 引用相同**

编写测试组件：两个 `CanvasProvider` 并排，各在 children 内用 **`useCanvasRuntime()`** 将 `yoga`/`canvasKit` 写入 `ref`（或通过 data 属性暴露）。`runtimeOptions={{ loadDefaultParagraphFonts: false }}` 以加快 CI。`await act` + `setTimeout` 等待 WASM（参考 `canvas-view.test.tsx` 的 100–1500ms 策略）。

```tsx
expect(refA.current!.yoga).toBe(refB.current!.yoga);
expect(refA.current!.canvasKit).toBe(refB.current!.canvasKit);
```

- [ ] **Step 2: 冲突不抛错**

先 mount Provider A（`loadDefaultParagraphFonts: false`），再 mount B（`true`）或相反；断言两者最终 `isReady` 且无 ErrorBoundary 捕获；对 `console.warn` 使用 `vi.spyOn(console, "warn").mockImplementation(() => {})`，可选断言 `warn` 被调用（若 core 实现为 dev warn，测试环境需 `import.meta.env.DEV === true` 或 stub）。

若 Vitest 中 `import.meta.env.DEV` 为 false，可 **仅** 断言不抛错、双就绪；warn 为可选验收。

- [ ] **Step 3: 运行测试**

```bash
vp test packages/react/tests/canvas/canvas-multi-provider.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/react/tests/canvas/canvas-multi-provider.test.tsx
git commit -m "test(react): multi CanvasProvider share runtime refs"
```

---

### Task 4: 可选 `preloadCanvasRuntime`

**Files:**

- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 添加别名**

```typescript
/** 与 `initCanvasRuntime` 相同；便于在应用入口表达「预加载」意图。 */
export const preloadCanvasRuntime = initCanvasRuntime;
```

- [ ] **Step 2: `vp check` 与 commit**

```bash
vp check && git add packages/core/src/index.ts && git commit -m "feat(core): add preloadCanvasRuntime alias"
```

---

### Task 5: 文档与站点

**Files:**

- Modify: `docs/superpowers/specs/2026-04-09-canvas-runtime-multi-provider-design.md`（状态改为「已实现」或「进行中」视完成情况）
- Modify: `apps/website/src/content/docs/playground/multi-canvas.mdx`
- Modify: `apps/website/src/components/MultiCanvasPlayground.tsx`（若存在强硬措辞）
- Modify: `apps/website/src/content/docs/guides/runtime-layout.mdx` 或 `intro/quickstart.mdx`

- [ ] **Step 1:** 将「可优先采用」「必须」等改为 **建议**；保留 A/B 对照说明 WASM 与 WebGL。
- [ ] **Step 2:** 在指南中增加 3–6 句 + 链到规格 `../superpowers/specs/2026-04-09-canvas-runtime-multi-provider-design.md`（路径按站点实际调整）。
- [ ] **Step 3:** `vp check`，全量 `vp test`（若项目惯例）。

```bash
vp check && vp test
```

- [ ] **Step 4: Commit**

```bash
git commit -m "docs: multi-provider runtime wording and cross-links"
```

---

## 计划自检（对照规格）

| 规格章节                              | 对应任务                                              |
| ------------------------------------- | ----------------------------------------------------- |
| §3 多 Provider、Context 值引用一致    | Task 2 + Task 3                                       |
| §4 字体冲突首次为准、dev warn、不抛错 | Task 1                                                |
| §5.2 subscribe + useSyncExternalStore | Task 1 + Task 2                                       |
| §5.3 preload 可选                     | Task 4                                                |
| §6 测试策略                           | Task 3                                                |
| §7 文档                               | Task 5                                                |
| §8 不破坏公开 API                     | `CanvasProvider` props 不变；`initCanvasRuntime` 保留 |

**占位符扫描：** 本计划无「TBD」实现步骤；具体函数名以 Task 1 为准，若与仓库命名冲突可改为 `subscribeCanvasRuntime` 等，但需在首任务中统一导出。

---

## 执行方式（完成后由维护者选择）

**计划已保存至 `docs/superpowers/plans/2026-04-09-canvas-runtime-multi-provider-implementation.md`。两种执行方式：**

1. **Subagent-Driven（推荐）** — 每任务派生子代理，任务间人工/检查点复核，迭代快。
2. **Inline Execution** — 本会话或长会话中按任务顺序执行，配合 executing-plans 的检查点。

**请选择 1 或 2；若开始实现，请先完成 Task 1（core store），再 Task 2（react），否则订阅源不存在。**
