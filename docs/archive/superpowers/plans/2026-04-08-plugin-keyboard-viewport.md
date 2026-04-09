# plugin-keyboard + plugin-viewport 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 monorepo 中新增 `@react-canvas/plugin-keyboard` 与 `@react-canvas/plugin-viewport`，使应用可组合键盘监听、画布视口平移/缩放（Cmd/Ctrl+滚轮缩放、中键拖拽平移、可选 Space+左键平移），并与现有 `ScrollView` 滚轮**不冲突**；规格见 `docs/superpowers/specs/2026-04-08-react-canvas-plugins-viewport-keyboard-design.md`。

**Architecture:** 键盘与视口为独立 workspace 包，`peerDependencies` 与 `ui` 一致；`@react-canvas/react` 的 `attachCanvasPointerHandlers` 增加 **Cmd/Ctrl+滚轮时提前 return**，避免 ScrollView 吞掉修饰键滚轮；视口插件在 `canvas` 上注册 **wheel**（缩放）与 **capture 阶段 pointer**（中键/Space+左键平移），应用将 `translateX/Y`/`scale` 绑定到**根 `View` 的 `style.transform`**（与现有 `hit-test` 世界矩阵一致，首版以验证为主；若发现偏差再补单点坐标映射）。采用规格 **档 A**（独立 `attach*`），不强制档 B。

**Tech Stack:** `vite-plus`（`vp pack` / `vp test`）、Vitest、jsdom、React 19、TypeScript；与现有 `packages/ui` 包结构对齐。

---

## 文件结构（新建 / 修改）

| 路径                                                              | 职责                                                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `packages/plugin-keyboard/package.json`                           | 包名与 workspace peer                                                                  |
| `packages/plugin-keyboard/vite.config.ts`                         | 与 `ui` 类似的 pack + vitest jsdom                                                     |
| `packages/plugin-keyboard/src/index.ts`                           | 导出 `useKeyboardMonitor`                                                              |
| `packages/plugin-keyboard/src/use-keyboard-monitor.ts`            | keydown/keyup → `pressedKeys` / `isKeyDown`                                            |
| `packages/plugin-keyboard/tests/use-keyboard-monitor.test.tsx`    | 键盘状态与卸载                                                                         |
| `packages/plugin-keyboard/README.md`                              | API 与用法                                                                             |
| `packages/plugin-viewport/package.json`                           | peer：`react`、`@react-canvas/react`；可选 `plugin-keyboard` 为 devDependency 用于联测 |
| `packages/plugin-viewport/vite.config.ts`                         | 同上                                                                                   |
| `packages/plugin-viewport/src/index.ts`                           | 导出 `useViewportState`、`attachViewportHandlers`、`clampViewportScale` 等             |
| `packages/plugin-viewport/src/viewport-state.ts`                  | 纯函数：`clampScale`、`zoomAtPoint`（指针下缩放数学）                                  |
| `packages/plugin-viewport/src/attach-viewport-handlers.ts`        | DOM 事件与状态更新                                                                     |
| `packages/plugin-viewport/tests/viewport-state.test.ts`           | 纯逻辑单测                                                                             |
| `packages/plugin-viewport/tests/attach-viewport-handlers.test.ts` | wheel 修饰键分支（mock）                                                               |
| `packages/plugin-viewport/README.md`                              | 注册顺序、`attachCanvasPointerHandlers` 与修饰键约定                                   |
| `packages/react/src/input/canvas-pointer.ts`                      | `onWheel` 开头增加 `metaKey`/`ctrlKey` 早退                                            |
| `pnpm-workspace.yaml` / 根 `package.json`                         | 若需 `pnpm -r` 显式列出；通常 `packages/*` 已覆盖                                      |
| `docs/development-roadmap.md`                                     | 可选：一行指向新插件包                                                                 |

---

### Task 1: 新建 `@react-canvas/plugin-keyboard` 包壳

**Files:**

- Create: `packages/plugin-keyboard/package.json`
- Create: `packages/plugin-keyboard/vite.config.ts`
- Create: `packages/plugin-keyboard/tsconfig.json`
- Create: `packages/plugin-keyboard/src/index.ts`
- Create: `packages/plugin-keyboard/tests/setup.ts`

- [ ] **Step 1: 复制 `packages/ui/package.json` 为模板，改为 `name: "@react-canvas/plugin-keyboard"`，`description` 为键盘监听插件；**删除** `peerDependencies` 中的 `@lucide/icons`；**保留** `peerDependencies.react`；**peerDependencies** 可不包含 `@react-canvas/react`（本包不依赖 React Canvas 运行时）；**devDependencies\*\* 含 `react`、`react-dom`、`typescript`、`vite-plus`、与 `ui` 对齐的 `@types/react`。
- [ ] **Step 2: 复制 `packages/ui/vite.config.ts`，将 `lint.ignorePatterns` / `test.setupFiles` 指向本包；`pack.deps.neverBundle` 仅含 `react`（无 core）。**
- [ ] **Step 3: 复制 `packages/react/tsconfig.json` 或 `packages/ui/tsconfig.json` 为 `packages/plugin-keyboard/tsconfig.json`（`include` 含 `src`）。**
- [ ] **Step 4: `tests/setup.ts` 与 `packages/ui/tests/setup.ts` 相同内容（`IS_REACT_ACT_ENVIRONMENT`）。**
- [ ] **Step 5: `src/index.ts` 暂时 `export { useKeyboardMonitor } from "./use-keyboard-monitor.ts";`（下一步实现）。**
- [ ] **Step 6: 在仓库根目录运行 `vp install`（若尚未安装），再 `cd packages/plugin-keyboard && vp check` 与 `vp test`（预期无测试或空通过）。**

Run: `cd /Users/zhouou/Desktop/react-canvas && vp install && cd packages/plugin-keyboard && vp check`  
Expected: 通过（或仅缺实现文件时先跳过，完成 Task 2 后再跑）。

- [ ] **Step 7: Commit**

```bash
git add packages/plugin-keyboard
git commit -m "feat(plugin-keyboard): scaffold package"
```

---

### Task 2: 实现 `useKeyboardMonitor` 与测试

**Files:**

- Create: `packages/plugin-keyboard/src/use-keyboard-monitor.ts`
- Modify: `packages/plugin-keyboard/src/index.ts`
- Create: `packages/plugin-keyboard/tests/use-keyboard-monitor.test.tsx`

- [ ] **Step 1: 实现 `useKeyboardMonitor`**

```typescript
// packages/plugin-keyboard/src/use-keyboard-monitor.ts
import { useCallback, useEffect, useState } from "react";

/**
 * 监听 `keydown` / `keyup`（冒泡阶段），维护当前按下的 `event.code` 集合。
 * @param target 默认 `window`；可传 `document` 或 `null`（不监听）。
 */
export function useKeyboardMonitor(
  target: EventTarget | null = typeof window !== "undefined" ? window : null,
): {
  pressedKeys: ReadonlySet<string>;
  isKeyDown: (code: string) => boolean;
} {
  const [pressedKeys, setPressedKeys] = useState(() => new Set<string>());

  const isKeyDown = useCallback(
    (code: string) => {
      return pressedKeys.has(code);
    },
    [pressedKeys],
  );

  useEffect(() => {
    if (target == null) return;

    const onKeyDown = (ev: KeyboardEvent) => {
      setPressedKeys((prev) => {
        if (prev.has(ev.code)) return prev;
        const next = new Set(prev);
        next.add(ev.code);
        return next;
      });
    };

    const onKeyUp = (ev: KeyboardEvent) => {
      setPressedKeys((prev) => {
        if (!prev.has(ev.code)) return prev;
        const next = new Set(prev);
        next.delete(ev.code);
        return next;
      });
    };

    const onBlur = () => {
      setPressedKeys(new Set());
    };

    target.addEventListener("keydown", onKeyDown);
    target.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [target]);

  return { pressedKeys, isKeyDown };
}
```

- [ ] **Step 2: 编写 Vitest（`@testing-library/react` 若未安装则用 `react-dom/client` + `act` 派发 `KeyboardEvent`）**

若 `packages/ui` 未使用 `@testing-library/react`，在 **jsdom** 中手动 `document.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }))` 并断言 hook 返回值（用 `renderHook` 需 `@testing-library/react` — **建议** devDependency 增加 `@testing-library/react` 与 `happy-dom` 或保持 **jsdom**；最小可行：用 `render` + 测试组件读取 ref 上的 `isKeyDown`）。

**最小测试组件示例（无 testing-library）：**

```tsx
// packages/plugin-keyboard/tests/use-keyboard-monitor.test.tsx
import { createRoot } from "react-dom/client";
import { act, useEffect, useRef } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useKeyboardMonitor } from "../src/use-keyboard-monitor.ts";

function Probe({ onReady }: { onReady: (api: ReturnType<typeof useKeyboardMonitor>) => void }) {
  const api = useKeyboardMonitor();
  const ref = useRef(false);
  useEffect(() => {
    if (!ref.current) {
      ref.current = true;
      onReady(api);
    }
  }, [api, onReady]);
  return null;
}

describe("useKeyboardMonitor", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  afterEach(() => {
    root?.unmount();
    container?.remove();
  });

  it("tracks Space keydown and keyup", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    let api: ReturnType<typeof useKeyboardMonitor> | null = null;
    await act(async () => {
      root.render(<Probe onReady={(a) => (api = a)} />);
    });
    expect(api).not.toBeNull();
    expect(api!.isKeyDown("Space")).toBe(false);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
    });
    expect(api!.isKeyDown("Space")).toBe(true);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "Space", bubbles: true }));
    });
    expect(api!.isKeyDown("Space")).toBe(false);
  });
});
```

**修正：** 与 `packages/react/tests` 一致，从 **`react`** 导入 `act`（React 19）。

检查 `packages/react/tests/setup.ts` 或现有测试的 `act` 来源。

- [ ] **Step 3: 运行 `cd packages/plugin-keyboard && vp test`**  
       Expected: 通过。

- [ ] **Step 4: 编写 `README.md`（导出 API、默认 `window`、卸载时清空）**
- [ ] **Step 5: Commit**

```bash
git add packages/plugin-keyboard
git commit -m "feat(plugin-keyboard): add useKeyboardMonitor"
```

---

### Task 3: `@react-canvas/react` — 滚轮修饰键早退

**Files:**

- Modify: `packages/react/src/input/canvas-pointer.ts`（`onWheel` 函数开头）

- [ ] **Step 1: 在 `onWheel` 内，在 `clientToCanvasLogical` 之前或之后插入**（推荐紧接函数开头）：

```typescript
const onWheel = (ev: WheelEvent) => {
  if (ev.metaKey || ev.ctrlKey) return;
  const { x: pageX, y: pageY } = clientToCanvasLogical();
  // ... existing
  // ... rest unchanged
};
```

- [ ] **Step 2: 在 `packages/react/tests/` 或现有 `canvas-pointer` 相关测试中增加用例：若 `metaKey: true` 且存在 ScrollView，**不**应改变 `scrollY`（需 mock 或最小场景）。若现有测试无此文件，**新增** `packages/react/tests/input/canvas-wheel-modifier.test.ts`（用 jsdom + 模拟 Canvas 与 scene — 若过重，可**仅**保留 `onWheel` 的单元测试：抽出纯函数 `shouldScrollViewHandleWheel(ev: WheelEvent): boolean` 或 **仅** 文档 + 手动验收；**YAGNI** 首版可接受 **仅改代码 + 文档站\*\*）。

- [ ] **Step 3: `cd packages/react && vp test && vp check`**

- [ ] **Step 4: Commit**

```bash
git add packages/react/src/input/canvas-pointer.ts
git commit -m "fix(react): ignore wheel when meta or ctrl for viewport zoom"
```

---

### Task 4: 新建 `@react-canvas/plugin-viewport` 包壳与纯函数

**Files:**

- Create: `packages/plugin-viewport/package.json`
- Create: `packages/plugin-viewport/vite.config.ts`
- Create: `packages/plugin-viewport/tsconfig.json`
- Create: `packages/plugin-viewport/src/index.ts`
- Create: `packages/plugin-viewport/src/viewport-state.ts`
- Create: `packages/plugin-viewport/tests/viewport-state.test.ts`

- [ ] **Step 1: `package.json` 中 `peerDependencies`：`react`、`@react-canvas/react`（与 `ui` 一致）；`devDependencies` 含 `@react-canvas/react`、`@react-canvas/core`（若测试需要类型）、`vite-plus`。**
- [ ] **Step 2: 实现纯函数（与 DOM 无关）**

```typescript
// packages/plugin-viewport/src/viewport-state.ts
export type ViewportState = {
  translateX: number;
  translateY: number;
  scale: number;
};

export const DEFAULT_VIEWPORT: ViewportState = {
  translateX: 0,
  translateY: 0,
  scale: 1,
};

export function clampViewportScale(scale: number, min = 0.1, max = 8): number {
  return Math.min(max, Math.max(min, scale));
}

/**
 * 以 (fx, fy) 为焦点，缩放 factor 倍，更新平移使焦点在视口内位置不变（逻辑坐标系）。
 */
export function zoomAtViewportPoint(
  state: ViewportState,
  factor: number,
  fx: number,
  fy: number,
  minScale = 0.1,
  maxScale = 8,
): ViewportState {
  const s0 = state.scale;
  const s1 = clampViewportScale(s0 * factor, minScale, maxScale);
  if (s1 === s0) return state;
  const r = s1 / s0;
  return {
    scale: s1,
    translateX: fx - r * (fx - state.translateX),
    translateY: fy - r * (fy - state.translateY),
  };
}

export function panViewport(state: ViewportState, dx: number, dy: number): ViewportState {
  return {
    ...state,
    translateX: state.translateX + dx,
    translateY: state.translateY + dy,
  };
}
```

- [ ] **Step 3: `viewport-state.test.ts` 断言 `zoomAtViewportPoint` 焦点不动（数值近似）与 `clamp`。**
- [ ] **Step 4: `vp test` / `vp check`**

- [ ] **Step 5: Commit**

```bash
git add packages/plugin-viewport
git commit -m "feat(plugin-viewport): scaffold and viewport math"
```

---

### Task 5: `attachViewportHandlers`（wheel + 指针平移）

**Files:**

- Create: `packages/plugin-viewport/src/attach-viewport-handlers.ts`
- Modify: `packages/plugin-viewport/src/index.ts`
- Create: `packages/plugin-viewport/tests/attach-viewport-handlers.test.ts`（以 **纯函数** 或 **mock 事件** 为主）

**接口草案（实现时以 TypeScript 类型为准）：**

```typescript
export type AttachViewportHandlersOptions = {
  logicalWidth: number;
  logicalHeight: number;
  getState: () => ViewportState;
  setState: (next: ViewportState | ((prev: ViewportState) => ViewportState)) => void;
  /** Space 是否按下；不传则仅中键平移 */
  isSpaceDown?: () => boolean;
  minScale?: number;
  maxScale?: number;
};

export function attachViewportHandlers(
  canvas: HTMLCanvasElement,
  options: AttachViewportHandlersOptions,
): () => void;
```

- [ ] **Step 1: `wheel`：** 若 `ev.metaKey || ev.ctrlKey`，`preventDefault()`，`deltaY` 映射为 `factor`（如 `Math.exp(-ev.deltaY * 0.001)`），**指针** 在 `canvas` 上的逻辑坐标用 `getBoundingClientRect` 与 `logicalWidth/Height` 做与 `clientToCanvasLogical` 相同公式（**复制** `packages/react/src/input/canvas-pointer.ts` 中公式到独立函数 `clientToLogicalLogical` 避免循环依赖），调用 `zoomAtViewportPoint`。
- [ ] **Step 2: 中键 `pointerdown`（capture）：** `ev.button === 1` 时 `ev.preventDefault()`、`ev.stopPropagation()`（避免与画布 `pointerdown` 冲突），记录 `lastX`/`lastY`；`document` `pointermove` 更新 `panViewport`；`pointerup` 结束。**注意：** 与 `attachCanvasPointerHandlers` 同绑 `canvas` 时，**capture 先于 bubble**，中键不触发画布命中为可接受行为。
- [ ] **Step 3: Space+左键：** `pointerdown` bubble 或 capture 中若 `button===0` 且 `isSpaceDown?.()`，同样进入 pan 模式（与 `plugin-keyboard` 配合）。
- [ ] **Step 4: 返回 `detach` 移除所有监听器。**
- [ ] **Step 5: README 中写明：与 `attachCanvasPointerHandlers` 可同时存在；**`react` 已忽略 Cmd/Ctrl+滚轮\*\* 给本插件使用。

- [ ] **Step 6: `vp test` / `vp check`**

- [ ] **Step 7: Commit**

```bash
git add packages/plugin-viewport
git commit -m "feat(plugin-viewport): attach wheel zoom and pan handlers"
```

---

### Task 6: 根 `View` transform 绑定约定（文档 + 可选示例）

**Files:**

- Modify: `packages/plugin-viewport/README.md`
- Optional: `apps/website/src/components/MobileAppLab.tsx` 或 `docs/` 示例片段

- [ ] \*\*Step 1: 在 README 中说明：将 `ViewportState` 映射为根 `View` 的 `style.transform` 数组，例如：

```tsx
transform: [
  { translateX: state.translateX, translateY: state.translateY },
  { scale: state.scale },
],
```

（顺序与 `transform.ts` 从左到右语义一致；若与视觉不符，可微调顺序并文档化。）

- [ ] **Step 2: 说明** `hitTest` 与 `buildLocalTransformMatrix` 已包含 `transform`，首版**无需**额外逆映射；若集成后发现偏移，再开 issue 补 `attachCanvasPointerHandlers` 的可选映射。

- [ ] **Step 3:（可选）** 在 `MobileAppLab` 中接入 `useViewportState` + `attachViewportHandlers` 的 **demo**（需 `Canvas` 暴露 `ref` 或 `onReady` 回调以拿到 `canvas` — **若当前 `Canvas` 未暴露**，本步改为 **仅文档示例** 或 **小改 `Canvas` 增加 `canvasRef`** — 实现时评估 YAGNI）。

- [ ] **Step 4: Commit**

```bash
git add packages/plugin-viewport/README.md
git commit -m "docs(plugin-viewport): viewport transform binding and hit-test note"
```

---

### Task 7: 根仓库 `vp run -r build` / `vp run -r test` 与路线图

- [ ] **Step 1: 在仓库根运行 `vp run -r test` 与 `vp run -r build`（或 `pnpm -r test` / `pnpm -r build` 与 AGENTS 一致）**  
       Expected: 全部通过。

- [ ] **Step 2: `docs/development-roadmap.md` 增加简短条目指向两插件包（可选）。**

- [ ] **Step 3: 更新规格 `2026-04-08-react-canvas-plugins-viewport-keyboard-design.md` 状态为「已实现」或「部分实现」（与事实一致）。**

- [ ] **Step 4: Commit**

```bash
git add docs/development-roadmap.md docs/superpowers/specs/2026-04-08-react-canvas-plugins-viewport-keyboard-design.md
git commit -m "docs: link plugin-keyboard and plugin-viewport in roadmap"
```

---

## 规格自检（计划 vs 规格）

| 规格 §                              | 计划覆盖        |
| ----------------------------------- | --------------- |
| 键盘插件（hook、冒泡、默认 window） | Task 2          |
| Cmd/Ctrl+滚轮缩放、未修饰键不拦截   | Task 3 + Task 5 |
| 中键平移、Space+左键（可选）        | Task 5 + Task 2 |
| 档 A、独立 attach                   | Task 5          |
| 状态 translate/scale、clamp         | Task 4–5        |
| 命中与 transform 一致（首版验证）   | Task 6          |
| 测试                                | Task 2、4、5、7 |

**占位符扫描：** 无 TBD；`Canvas` ref 若未实现则 Task 6 为文档示例。

---

## 执行交接

Plan complete and saved to `docs/superpowers/plans/2026-04-08-plugin-keyboard-viewport.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
