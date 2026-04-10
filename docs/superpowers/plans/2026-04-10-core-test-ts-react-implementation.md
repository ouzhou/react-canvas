# core-test 原生 TS / React 双实现 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/core-test` 内为可对齐的 demo 增加 React 实现，与既有 TS demo 并列；通过 `?impl=ts|react` 与 UI 切换；`standalone` 与 `package` 在 React 模式下仅占位。交付后 `vp check` 通过，应用可 `vp dev` 手工验收。

**Architecture:** 平行文件 `demo-*.react.tsx` 导出 `mountXxxDemoReact`，签名对齐既有 `mountXxxDemo`；公共逻辑放在 `src/lib/`（占位 stub、可选 React 挂载辅助）。`src/main.ts` 集中解析 `impl`、渲染切换控件、在 `run()` 中按 `impl` + `demo` id 分发。React 侧使用 `@react-canvas/react` 的 `CanvasProvider` + `<Canvas>` + 宿主组件复刻 TS 场景。

**Tech Stack:** TypeScript、`react` / `react-dom`（catalog）、`@vitejs/plugin-react`（catalog）、Vite+（`vp dev` / `vp check`）、`@react-canvas/core`、`@react-canvas/react`（workspace）。

**依据 spec：** [`docs/superpowers/specs/2026-04-10-core-test-ts-react-demos-design.md`](../specs/2026-04-10-core-test-ts-react-demos-design.md)

---

## 文件与职责总览

| 路径                                                       | 职责                                                                                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `apps/core-test/package.json`                              | 增加 `react`、`react-dom`、`@react-canvas/react`、`@vitejs/plugin-react`（dev）；版本用 workspace catalog（`catalog:`） |
| `apps/core-test/vite.config.ts`（新建）                    | 注册 `@vitejs/plugin-react`，使 `*.tsx` 可被应用构建                                                                    |
| `apps/core-test/tsconfig.json`                             | 增加 `"jsx": "react-jsx"`；必要时增加 `"types"` 以覆盖 React                                                            |
| `apps/core-test/src/main.ts`                               | 解析/写入 `impl`；挂载「实现」切换 UI；`run()` 按 `impl` 调用 TS 或 React 或占位                                        |
| `apps/core-test/src/style.css`                             | 若有必要，为 `impl` 切换条增加少量样式（保持与现有 shell 一致）                                                         |
| `apps/core-test/src/lib/non-react-demo-stub.ts`            | `standalone` / `package` 在 `impl=react` 时的占位挂载与 cleanup                                                         |
| `apps/core-test/src/lib/react-demo-root.tsx`（可选但推荐） | 封装 `createRoot` + `StrictMode` + `CanvasProvider` + loading/error UI，减少每个 demo 重复                              |
| `apps/core-test/src/demos/demo-*.react.tsx`                | 与各 `demo-*.ts` 一一对照；导出 `mountXxxDemoReact`                                                                     |

**无 React 场景（仅占位）的 id：** `standalone`、`package`。

**需提供 React 场景的 demo 文件（16 个）：**

| TS 文件                     | React 文件（约定）                 | 导出函数名（约定：`…React` 后缀） |
| --------------------------- | ---------------------------------- | --------------------------------- |
| `demo-architecture.ts`      | `demo-architecture.react.tsx`      | `mountArchitectureDemoReact`      |
| `demo-runtime-status.ts`    | `demo-runtime-status.react.tsx`    | `mountRuntimeStatusDemoReact`     |
| `demo-stage.ts`             | `demo-stage.react.tsx`             | `mountStageDemoReact`             |
| `demo-stage-layers.ts`      | `demo-stage-layers.react.tsx`      | `mountStageLayersDemoReact`       |
| `demo-node-model.ts`        | `demo-node-model.react.tsx`        | `mountNodeModelDemoReact`         |
| `demo-layout-engine.ts`     | `demo-layout-engine.react.tsx`     | `mountLayoutEngineDemoReact`      |
| `demo-opacity-zindex.ts`    | `demo-opacity-zindex.react.tsx`    | `mountRenderPipelineDemoReact`    |
| `demo-events.ts`            | `demo-events.react.tsx`            | `mountEventsDemoReact`            |
| `demo-animation.ts`         | `demo-animation.react.tsx`         | `mountAnimationDemoReact`         |
| `demo-frame-scheduler.ts`   | `demo-frame-scheduler.react.tsx`   | `mountFrameSchedulerDemoReact`    |
| `demo-pending-issues.ts`    | `demo-pending-issues.react.tsx`    | `mountPendingIssuesDemoReact`     |
| `demo-interaction-focus.ts` | `demo-interaction-focus.react.tsx` | `mountInteractionFocusDemoReact`  |
| `demo-cursor.ts`            | `demo-cursor.react.tsx`            | `mountCursorDemoReact`            |
| `demo-overflow-clip.ts`     | `demo-overflow-clip.react.tsx`     | `mountOverflowClipDemoReact`      |
| `demo-scroll-view.ts`       | `demo-scroll-view.react.tsx`       | `mountScrollViewDemoReact`        |
| `demo-plugin.ts`            | `demo-plugin.react.tsx`            | `mountPluginDemoReact`            |

---

## Task 1：依赖、Vite React 插件、TSConfig

**Files:**

- Modify: `apps/core-test/package.json`
- Create: `apps/core-test/vite.config.ts`
- Modify: `apps/core-test/tsconfig.json`

- [ ] **Step 1：编辑 `apps/core-test/package.json`**

在 `dependencies` 中追加（使用 pnpm catalog，与仓库其他包一致）：

```json
"react": "catalog:",
"react-dom": "catalog:",
"@react-canvas/react": "workspace:*"
```

在 `devDependencies` 中追加：

```json
"@types/react": "catalog:",
"@types/react-dom": "catalog:",
"@vitejs/plugin-react": "catalog:"
```

保留现有 `@react-canvas/core`、`typescript`、`vite`、`vite-plus`。

- [ ] **Step 2：仓库根目录执行 `vp install`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp install`  
Expected: 成功，无 lockfile 冲突。

- [ ] **Step 3：新建 `apps/core-test/vite.config.ts`**

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 4：修改 `apps/core-test/tsconfig.json`**

在 `compilerOptions` 中增加：

```json
"jsx": "react-jsx"
```

（保留 `include: ["src"]`。）

- [ ] **Step 5：`vp check`（在仓库根或 app 目录，以项目惯例为准）**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: 通过（若仅改 package 未用新文件，可能仍通过）。

- [ ] **Step 6：Commit**

```bash
git add apps/core-test/package.json apps/core-test/vite.config.ts apps/core-test/tsconfig.json pnpm-lock.yaml
git commit -m "chore(core-test): add react deps and vite react plugin"
```

---

## Task 2：`impl` 类型、URL 读写、占位 stub

**Files:**

- Create: `apps/core-test/src/lib/non-react-demo-stub.ts`

- [ ] **Step 1：新建 `non-react-demo-stub.ts`**

```ts
/**
 * `standalone` / `package`：spec 约定不提供 React 画布对照；仅清空容器并给出极简占位。
 */
export function mountNonReactDemoStub(container: HTMLElement): () => void {
  container.replaceChildren();
  const p = document.createElement("p");
  p.className = "impl-react-stub";
  p.textContent = "本项无 React 对照（见 design spec §2.1）。";
  container.appendChild(p);
  return () => {
    container.replaceChildren();
  };
}
```

- [ ] **Step 2：`vp check`**

Run: `vp check`  
Expected: PASS

- [ ] **Step 3：Commit**

```bash
git add apps/core-test/src/lib/non-react-demo-stub.ts
git commit -m "feat(core-test): add stub mount for non-react demos"
```

---

## Task 3：共享 React 挂载壳（CanvasProvider + Canvas）

**Files:**

- Create: `apps/core-test/src/lib/react-demo-root.tsx`

- [ ] **Step 1：新建 `react-demo-root.tsx`**

下列代码为**统一壳**；各 demo 只实现 `DemoScene`（返回**单个** `<View>` 根，符合 `<Canvas>` 单子约束）。尺寸与 TS 版 `createStageDemoHost(container, w, h)` 保持一致时传入相同 `width` / `height`。

```tsx
import { Canvas, CanvasProvider } from "@react-canvas/react";
import { StrictMode, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

export type ReactDemoSize = { width: number; height: number };

export type ReactDemoSceneRender = (size: ReactDemoSize) => ReactNode;

/**
 * 在 `container` 内 `createRoot`，挂载 `CanvasProvider` → ready 后 `<Canvas><Scene/></Canvas>`。
 * @returns cleanup：`root.unmount()` + `container.replaceChildren()`。
 */
export function mountReactCanvasDemo(
  container: HTMLElement,
  size: ReactDemoSize,
  Scene: React.ComponentType<ReactDemoSize>,
): () => void {
  container.replaceChildren();
  const root: Root = createRoot(container);
  root.render(
    <StrictMode>
      <CanvasProvider>
        {({ isReady, error }) => {
          if (error) {
            return (
              <div role="alert" className="impl-react-error">
                {String(error.message)}
              </div>
            );
          }
          if (!isReady) {
            return (
              <div aria-busy="true" className="impl-react-loading">
                Loading…
              </div>
            );
          }
          return (
            <Canvas width={size.width} height={size.height}>
              <Scene width={size.width} height={size.height} />
            </Canvas>
          );
        }}
      </CanvasProvider>
    </StrictMode>,
  );

  return () => {
    root.unmount();
    container.replaceChildren();
  };
}
```

说明：`Canvas` 的子组件必须是单个 `<View>`（见 `@react-canvas/react` 的 `assertSingleViewChild`），因此 `Scene` 组件内部应返回**一个**根 `View`，其下再挂子节点。

- [ ] **Step 2：`vp check`**

Expected: PASS

- [ ] **Step 3：Commit**

```bash
git add apps/core-test/src/lib/react-demo-root.tsx
git commit -m "feat(core-test): add shared react canvas demo shell"
```

---

## Task 4：参考实现 — `demo-architecture.react.tsx`

**Files:**

- Create: `apps/core-test/src/demos/demo-architecture.react.tsx`

**对照：** `apps/core-test/src/demos/demo-architecture.ts`（逻辑尺寸 `400×260`，`LINES` 文案与 padding/gap/颜色一致）。

- [ ] **Step 1：新建文件（完整实现）**

```tsx
import { Text, View } from "@react-canvas/react";
import { mountReactCanvasDemo, type ReactDemoSize } from "../lib/react-demo-root.tsx";

const LINES = [
  "§1 整体架构 · 分层（core-design.md §1.1）",
  "用户代码：View / Text / Image / ScrollView（RN 风格）",
  "  → @react-canvas/ui → @react-canvas/react",
  "  → @react-canvas/core（Stage / Layer / 布局 / 渲染 / 事件）",
  "  → yoga-layout（WASM）+ canvaskit-wasm（Skia）",
  "本页以下各 tab 按目录 §2–§18 逐项验收。",
] as const;

function ArchitectureScene({ width, height }: ReactDemoSize) {
  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        padding: 14,
        gap: 6,
        flexDirection: "column",
        backgroundColor: "#0f172a",
        justifyContent: "flex-start",
      }}
    >
      {LINES.map((line) => (
        <Text key={line} style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.35 }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

export function mountArchitectureDemoReact(container: HTMLElement): Promise<() => void> {
  return Promise.resolve(
    mountReactCanvasDemo(container, { width: 400, height: 260 }, ArchitectureScene),
  );
}
```

若 `Text` / `View` 的 `children` 类型与包内定义不一致，按 `packages/react/src/hosts/text.ts`、`view.ts` 的实际 API 微调（例如使用 `nodeValue` 或拆行组件），以 **类型检查通过** 为准。

- [ ] **Step 2：`vp check`**

Expected: PASS

- [ ] **Step 3：Commit**

```bash
git add apps/core-test/src/demos/demo-architecture.react.tsx
git commit -m "feat(core-test): add architecture demo react port"
```

---

## Task 5：`main.ts` 接入 `impl`、切换 UI、分发 React

**Files:**

- Modify: `apps/core-test/src/main.ts`
- Modify: `apps/core-test/src/style.css`（可选）

- [ ] **Step 1：在 `main.ts` 增加类型与常量**

```ts
type ImplId = "ts" | "react";

const IMPL_PARAM = "impl";

function normalizeImplParam(raw: string | null): ImplId {
  return raw === "react" ? "react" : "ts";
}

function readImplFromUrl(): ImplId {
  try {
    const q = new URLSearchParams(window.location.search).get(IMPL_PARAM);
    return normalizeImplParam(q);
  } catch {
    return "ts";
  }
}

function writeImplToUrl(impl: ImplId): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(IMPL_PARAM, impl);
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 2：在构建 `shell` 的 HTML 中（例如 `header` 内 `h1` 下方或 `aside` 顶部）增加「实现」切换区域**

使用 `document.createElement` 创建两个 `button`：`data-impl="ts"`、`data-impl="react"`，文案「原生 TS」「React」；`type="button"`；用 class 如 `impl-switch` / `impl-switch__btn` 便于样式。

- [ ] **Step 3：维护 `let activeImpl: ImplId = readImplFromUrl()`**，在 `run()` 开头与切换后调用 `writeImplToUrl(activeImpl)`；切换 demo 时保留当前 `impl`（与 spec「可分享状态」一致）。

- [ ] **Step 4：为 impl 按钮绑定 `click`**：更新 `activeImpl`、`syncImplNav()`（设置 `aria-pressed`）、`void run(active)`。

- [ ] **Step 5：在 `run()` 内，在现有 `if (id === "architecture")` 分支处改为：**

```ts
if (id === "architecture") {
  cleanup =
    activeImpl === "react"
      ? await mountArchitectureDemoReact(wrap)
      : await mountArchitectureDemo(wrap);
}
```

并 `import { mountArchitectureDemoReact } from "./demos/demo-architecture.react.tsx";`

- [ ] **Step 6：对 `standalone` 与 `package` 在 `activeImpl === "react"` 时调用 `mountNonReactDemoStub(wrap)`**，**不**调用 TS 的 `mountStandaloneApiDemo` / `mountPackageBoundaryDemo`（主区为占位；若希望仍显示 TS 版画布，则与 spec 冲突——本计划遵循 spec：不挂载画布）。

- [ ] **Step 7：`vp dev` 手动验证**

Run: `vp run core-test#dev`（或根目录 `pnpm core-test`）  
在浏览器打开：Architecture demo 在 TS/React 间切换无报错；URL 含 `?impl=react`；`standalone` + React 显示占位文案。

- [ ] **Step 8：`vp check`**

- [ ] **Step 9：Commit**

```bash
git add apps/core-test/src/main.ts apps/core-test/src/style.css
git commit -m "feat(core-test): wire impl param and architecture react demo"
```

---

## Tasks 6–20：其余 15 个 React demo 逐一移植

对下面每个 **Task**，模式相同：

1. 打开对应的 `demo-*.ts`，记录 `createStageDemoHost` 的尺寸、`sceneRoot` 上挂接的节点、动画/指针/`requestFrame`/`stage` 用法。
2. 新建 `demo-*.react.tsx`，导出 `mountXxxDemoReact`，**回调参数表**与 TS 版一致（例如 `(wrap, onStatus)`、`(wrap, appendEventLog)`）。
3. 使用 `mountReactCanvasDemo`；若 demo 需要 **多 Layer / 自定义 Stage**（如 `demo-stage-layers.ts`、`demo-plugin.ts`），而当前 `mountReactCanvasDemo` 仅支持单 `Canvas`，则在该 task 内**局部**扩展：或增加 `mountReactCanvasDemoWithRef` 传入 `onFrame`，或在该文件中单独 `createRoot` 并访问 `getCanvasFrame`（见 `@react-canvas/react` 的 `getCanvasFrame`）以绑定指针/相机——以 **与 TS 版行为一致** 为判据。
4. `main.ts` 的 `run()` 增加对应 `if` 分支：`activeImpl === "react" ? await mountXxxDemoReact(...) : await mountXxxDemo(...)`。
5. `vp check` 后 commit（可每个 demo 一 commit，或按组合并）。

**Task 6：** `demo-runtime-status.react.tsx` ← `demo-runtime-status.ts`  
**Task 7：** `demo-stage.react.tsx` ← `demo-stage.ts`（含 `ViewportCamera`、`attachCanvasPointerHandlers`）  
**Task 8：** `demo-stage-layers.react.tsx` ← `demo-stage-layers.ts`（modal layer；若 React 层 API 不足，在 task 内注明并改 `packages/react` 或复用 imperative `Stage` 仅场景用 React——优先保持 spec「React 实现」；若需 hybrid，在 commit message 说明）  
**Task 9：** `demo-node-model.react.tsx` ← `demo-node-model.ts`  
**Task 10：** `demo-layout-engine.react.tsx` ← `demo-layout-engine.ts`  
**Task 11：** `demo-opacity-zindex.react.tsx` ← `demo-opacity-zindex.ts`（`mountRenderPipelineDemoReact`）  
**Task 12：** `demo-events.react.tsx` ← `demo-events.ts`  
**Task 13：** `demo-animation.react.tsx` ← `demo-animation.ts`  
**Task 14：** `demo-frame-scheduler.react.tsx` ← `demo-frame-scheduler.ts`  
**Task 15：** `demo-pending-issues.react.tsx` ← `demo-pending-issues.ts`（若以 DOM 为主，React 侧可用 `createRoot` 渲染同等 DOM，不强制画布）  
**Task 16：** `demo-interaction-focus.react.tsx` ← `demo-interaction-focus.ts`  
**Task 17：** `demo-cursor.react.tsx` ← `demo-cursor.ts`  
**Task 18：** `demo-overflow-clip.react.tsx` ← `demo-overflow-clip.ts`  
**Task 19：** `demo-scroll-view.react.tsx` ← `demo-scroll-view.ts`（使用 `@react-canvas/react` 的 `ScrollView`）  
**Task 20：** `demo-plugin.react.tsx` ← `demo-plugin.ts`

- [ ] **Step（贯穿 Task 6～20）：每完成一个文件即在 `main.ts` 接上分发，避免遗漏 id。**

---

## Task 21：收尾与全量验收

**Files:**

- Modify: `apps/core-test/src/main.ts`（确认所有 `DemoId` 在 `ts`/`react` 下均有分支，无 fall-through 到错误 mount）

- [ ] **Step 1：对照下表自检（`impl=react`）**

| DemoId       | 预期                           |
| ------------ | ------------------------------ |
| `standalone` | 占位 stub，无画布              |
| `package`    | 占位 stub，无画布              |
| 其余         | 有画布，行为与 TS 验收意图一致 |

- [ ] **Step 2：运行 `vp check`**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp check`  
Expected: PASS

- [ ] **Step 3：运行 `vp dev` 全表点击**

Run: `vp run core-test#dev`，逐个 demo 切换 TS/React，刷新带 `?demo=&impl=` 的 URL。

- [ ] **Step 4：Commit（若有未提交变更）**

```bash
git status
git add -A
git commit -m "feat(core-test): complete react demo parity and main dispatch"
```

---

## Spec 对照自检（计划作者执行）

| Spec 要求                            | 覆盖 Task                                 |
| ------------------------------------ | ----------------------------------------- |
| 同应用 `impl` 切换                   | Task 5                                    |
| `?impl=ts\|react`，默认 `ts`         | Task 5                                    |
| `standalone`/`package` 无 React 画布 | Task 2、5、21                             |
| 其余 demo 有 React 版                | Task 4、6～20                             |
| cleanup 避免双 root/泄漏             | Task 3（`mountReactCanvasDemo`）、各 demo |
| `vp check`                           | 各 Task、`vp check` 步骤                  |

---

## 执行交接

Plan complete and saved to `docs/superpowers/plans/2026-04-10-core-test-ts-react-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
