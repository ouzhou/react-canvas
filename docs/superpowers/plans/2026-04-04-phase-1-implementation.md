# 阶段一：核心渲染管线 Implementation Plan

> **For agentic workers:** 按任务顺序执行；步骤使用 `- [ ]` 勾选。每完成一个 **Task** 建议 `git commit` 一次。验证统一用仓库约定的 **`vp`**（见根目录 `AGENTS.md`）。

**Goal:** 实现 `CanvasProvider` + `Canvas` + 自定义 Reconciler + `@react-canvas/core` 场景树（ViewNode、Yoga、CanvasKit），使嵌套 `<View style={...} />` 按 Flexbox 布局并在 Canvas 上绘制，满足 [phase-1-design.md](../../phase-1-design.md) 与 [2026-04-04-phase-1-clarifications-design.md](../specs/2026-04-04-phase-1-clarifications-design.md)。

**Architecture:** `core` 无 React 依赖：ViewNode、Yoga 映射、`calculateLayout`、`paintScene`/`paintNode`。`react` 包并行加载 WASM、Context、`Canvas` 内 `react-reconciler`、`queueLayoutPaintFrame` 去重 + `surface.requestAnimationFrame`。结构校验见 [runtime-structure-constraints.md](../../runtime-structure-constraints.md)。

**Tech Stack:** `react@19`、`react-reconciler@0.33.0`、`yoga-layout`（`wasm-async`）、`canvaskit-wasm`（路线图 v0.41.x，以 `vp add` 解析版本为准）、测试通过 **`vp test`**，断言与 `describe`/`test`/`vi` 等从 **`vite-plus/test`** 导入（勿从 `vitest` 包导入）、Vite+（`vp pack` / `vp check`）。

**前置阅读:** [hostconfig-guide.md](../../hostconfig-guide.md)

---

## 文件结构（计划新增/大改）

| 路径                                             | 职责                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `packages/core/src/view-node.ts`                 | `ViewNode`、树操作、`destroy`、与 Yoga 节点生命周期                             |
| `packages/core/src/yoga-map.ts`                  | `applyStylesToYoga`、数值与百分比解析、RN 默认                                  |
| `packages/core/src/layout.ts`                    | 根 `calculateLayout`、将 computed 写回 `node.layout`                            |
| `packages/core/src/paint.ts`                     | `paintScene`、`paintNode`（display none / 零尺寸、`opacity`、背景、圆角、边框） |
| `packages/core/src/yoga-init.ts`                 | `initYoga()` 封装 `yoga-layout/wasm-async`                                      |
| `packages/core/src/index.ts`                     | 导出公共 API                                                                    |
| `packages/core/tests/*.test.ts`                  | 布局、destroy、百分比等                                                         |
| `packages/react/src/context.ts`                  | `CanvasRuntimeContext` 类型与 Context                                           |
| `packages/react/src/canvas-provider.tsx`         | 并行加载、render prop、`locateFile`                                             |
| `packages/react/src/queue-layout-paint-frame.ts` | `layoutPaintFrameQueued` + rAF                                                  |
| `packages/react/src/reconciler-config.ts`        | `HostConfig` 工厂（接收闭包：surface、root、dimensions）                        |
| `packages/react/src/canvas.tsx`                  | `<canvas>` ref、`MakeCanvasSurface`、单子校验、Reconciler 根                    |
| `packages/react/src/index.ts`                    | 导出 `CanvasProvider`、`Canvas`、`View`                                         |
| `packages/react/tests/*.test.ts`                 | Reconciler、批处理、非法多子抛错                                                |
| `apps/website/src/...` 或 `content`              | Playground 页面（依 Astro 现有结构选一）                                        |

---

### Task 1: 依赖与 workspace

**Files:**

- Modify: `packages/core/package.json`（dependencies）
- Modify: `pnpm-lock.yaml`（由包管理器生成）

- [ ] **Step 1:** 在仓库根执行 `vp add yoga-layout canvaskit-wasm -F @react-canvas/core`（若 `vp add` 语法不同，用 `vp add --help` 确认；等价于把两包加入 `packages/core` 的 `dependencies`）。

- [ ] **Step 2:** 确认 `packages/react/package.json` 已有 `react-reconciler`、`react`、`scheduler`；若缺 `react-dom` 且测试需要，仅加在 `devDependencies`（`vp add react-dom -D -F @react-canvas/react`）。

- [ ] **Step 3:** `vp install`

- [ ] **Step 4:** Commit：`chore(core): add yoga-layout and canvaskit-wasm for phase 1`

---

### Task 2: Core — ViewNode + Yoga 生命周期

**Files:**

- Create: `packages/core/src/view-node.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 失败测试** — `packages/core/tests/view-node-tree.test.ts`

```typescript
import { describe, it, expect, beforeAll } from "vite-plus/test";
// 伪代码：按实际 initYoga 导出调整
import { initYoga } from "../src/yoga-init.js";
import { ViewNode } from "../src/view-node.js";

describe("ViewNode", () => {
  let yoga: Awaited<ReturnType<typeof initYoga>>;

  beforeAll(async () => {
    yoga = await initYoga();
  });

  it("appendChild links yoga tree and children array", () => {
    const parent = new ViewNode(yoga, "View");
    const child = new ViewNode(yoga, "View");
    parent.appendChild(child);
    expect(parent.children).toContain(child);
    expect(child.parent).toBe(parent);
  });
});
```

运行：`cd packages/core && vp test`（或用根目录 workspace 的 `vp test` 过滤到该文件；勿直接调用 `vitest` CLI）。**期望：** 失败（模块不存在）。

- [ ] **Step 2:** 实现 `packages/core/src/yoga-init.ts`：`export async function initYoga()` 使用 `import('yoga-layout/wasm-async')` 或包文档推荐入口，返回含 `Node` 构造与 `Direction` 的运行时。

- [ ] **Step 3:** 实现 `ViewNode`：`type`、`yogaNode`、`parent`、`children`、`props`（含 `display?`）、`layout`、`dirty`；`appendChild` / `removeChild` / `insertBefore` / `destroy`（递归 `free()`）；构造时 `new yoga.Node()`。

- [ ] **Step 4:** 测试通过；`vp check`（在 `packages/core` 或根递归）。

- [ ] **Step 5:** Commit：`feat(core): ViewNode and Yoga tree operations`

---

### Task 3: Core — `applyStylesToYoga` + 百分比 + 视觉 props

**Files:**

- Create: `packages/core/src/yoga-map.ts`
- Modify: `packages/core/src/view-node.ts`（`setStyle` / `updateStyle` 调用 map）

- [ ] **Step 1: 测试** — `packages/core/tests/yoga-map-layout.test.ts`：建根+子，`setStyle` 设 `width: 100, height: 50` 与 `flexDirection: 'row'`、`flex: 1` 双子，根 `calculateLayout(200,200)` 后断言 `layout.width/left`（与 phase-1 验收一致：两列各 100）。

- [ ] **Step 2:** 实现 `applyStylesToYoga`：覆盖 [phase-1-design.md §1.3](../../phase-1-design.md) 表；**百分比**字符串走 Yoga 的 percent API（查阅 `yoga-layout` TS 类型）；**根下第一层** 百分比父尺寸由调用方传入的 **Canvas 逻辑宽高** 在布局入口处理（可在 `calculateLayout` 前对根子设置约束，或文档约定仅对子节点用百分比且父有明确宽度——与 clarifications 一致）。

- [ ] **Step 3:** `setStyle` / `updateStyle`：布局键 → Yoga；视觉键 → `props`；同步 `props.display`。

- [ ] **Step 4:** 测试通过。

- [ ] **Step 5:** Commit：`feat(core): applyStylesToYoga and ViewNode styles`

---

### Task 4: Core — `calculateLayout` + `paintScene` / `paintNode`

**Files:**

- Create: `packages/core/src/layout.ts`
- Create: `packages/core/src/paint.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1:** `layout.ts`：根 `calculateLayout(width, height)` 调 `yogaNode.calculateLayout` + DFS 写 `layout`。

- [ ] **Step 2:** 在测试中 mock 或最小化 CanvasKit：阶段一 **绘制** 全链路可在 **浏览器/后续 Task** 测；core 可先测 **layout 数值**。**paint** 单元测试若无法在 Node 加载 CanvasKit，则 **跳过** 或 **浏览器模式**（若 `vp test` / 配置支持；否则在 Task 8 用 react+jsdom+mock canvas 测调用路径）。**计划约定：** `paint.ts` 纯函数接收 `canvasKit`、`skCanvas`、`dpr`，在 `packages/react` 集成测试中验证 **被调用**；像素级在 playground 人眼验收。

- [ ] **Step 3:** 实现 `paintScene` / `paintNode` 按 [phase-1-design.md §2.4](../../phase-1-design.md)（`display: none` 不递归；`w/h<=0` 不画背景边框但递归子节点；`opacity` saveLayer；圆角/边框）。

- [ ] **Step 4:** Commit：`feat(core): layout propagation and paintScene`

---

### Task 5: React — Context + `CanvasProvider`

**Files:**

- Create: `packages/react/src/context.ts`
- Create: `packages/react/src/canvas-provider.tsx`
- Modify: `packages/react/src/index.ts`

- [ ] **Step 1:** `CanvasRuntimeContext`：`{ yoga, canvasKit } | null`；Provider 内 `Promise.all([initYoga(), CanvasKitInit({ locateFile })])`，错误写入 state。

- [ ] **Step 2:** Render prop `children({ isReady, error })` 与 clarifications 一致。

- [ ] **Step 3:** **R-ROOT-1**：子组件 `useCanvasRuntime()` 在缺失时由 `Canvas` 使用并 throw（可在 `Canvas` 中检测）。

- [ ] **Step 4:** Commit：`feat(react): CanvasProvider and runtime context`

---

### Task 6: React — `queueLayoutPaintFrame`

**Files:**

- Create: `packages/react/src/queue-layout-paint-frame.ts`

- [ ] **Step 1:** 实现模块级 `layoutPaintFrameQueued` + `surface.requestAnimationFrame` 回调内 `calculateLayout` + `paintScene` + `Paint` 生命周期，签名与 [phase-1-design.md §3.3](../../phase-1-design.md) 一致。

- [ ] **Step 2:** Commit：`feat(react): queueLayoutPaintFrame`

---

### Task 7: React — Reconciler HostConfig + `Canvas`

**Files:**

- Create: `packages/react/src/reconciler-config.ts`（或 `host-config.ts`）
- Create: `packages/react/src/canvas.tsx`
- Modify: `packages/react/src/index.ts`

- [ ] **Step 1:** `createReconciler(hostConfig)`；`HostConfig` 完整键位以 **`node_modules/react-reconciler` 与 `@types/react-reconciler@0.33.0`** 为准，**补全所有必填方法**（未用到的可 `noop` / `null` 返回）。

- [ ] **Step 2:** `createInstance` 仅 `'View'` → `new ViewNode(yoga,'View')` + `setStyle(initial)`；`createTextInstance` **throw**；`prepareUpdate` / `commitUpdate` 仅 `style` 对象；`resetAfterCommit` → `queueLayoutPaintFrame(...)`。

- [ ] **Step 3:** `Canvas`：`useRef<HTMLCanvasElement>`；`useLayoutEffect` 中 DPR、物理像素、`MakeCanvasSurface`；**单子节点**：`Children.count(children)===1` 且类型为 `View`（`child.type === View`），否则 **throw**；`createContainer` + `updateContainer` 绑定根 **隐式容器**（容器实例可用 **无渲染的占位 ViewNode** 或仅 Fiber 根 + 第一个子挂到「场景根 ViewNode」——与 clarifications **隐式根** 一致：实现时二选一并在代码注释标明）。

- [ ] **Step 4:** `getChildHostContext` 先透传 `{}`，为阶段二预留。

- [ ] **Step 5:** unmount：`surface.delete()`、reconciler root cleanup。

- [ ] **Step 6:** Commit：`feat(react): Canvas with reconciler and HostConfig`

---

### Task 8: React — 集成测试

**Files:**

- Create: `packages/react/tests/canvas-view.test.tsx`（或 `.ts` + `createRoot`）
- Modify: `packages/react/vite.config.ts`（或 Vite+ 约定的 test 配置）若需 **`environment: 'jsdom'`**

- [ ] **Step 1:** 配置 **`vp test`** 使用 **jsdom**（若尚未；仍通过 `vite-plus` 工具链，不单独安装 `vitest`）。

- [ ] **Step 2:** 测试：挂载 `CanvasProvider` → ready → `Canvas` + 双子 `View` 验收布局（需 **真实 WASM** 时可能较慢；可 `test.timeout(30000)`）。若 CI 无法加载 WASM，将此类测试标为 **可选** 或 **仅 local**，但 **须在文档写明**；优先目标：**本地 `vp test` 通过**。

- [ ] **Step 3:** 测试：**两个 `View` 并列为 `Canvas` 直接子节点** → **expect throw**。

- [ ] **Step 4:** 测试：连续 `setState` 两次，`queueLayoutPaintFrame` / rAF **mock** 或 spy **注册次数**（若难以 spy，则测「布局结果最终一致」）。

- [ ] **Step 5:** Commit：`test(react): Canvas and View reconciler integration`

---

### Task 9: Website — Playground

**Files:**

- Under `apps/website/`：新增一页或 MDX demo（嵌入 client island 加载 demo）

- [ ] **Step 1:** 添加最小 React 岛（Astro + `@vitejs/plugin-react` 若已有）展示 [phase-1-design.md §5](../../phase-1-design.md) 验收片段。

- [ ] **Step 2:** WASM `locateFile` 指向 `public/` 或 CDN，保证 dev 可跑。

- [ ] **Step 3:** Commit：`feat(website): phase 1 canvas playground`

---

### Task 10: 全仓验证与导出

- [ ] **Step 1:** `packages/core/src/index.ts` / `packages/react/src/index.ts` 导出 `View`、`CanvasProvider`、`Canvas` 及必要类型。

- [ ] **Step 2:** 根目录执行 `vp check` 与 `vp test`（或 `pnpm` workspace 等价脚本 `vp run ready` 若已配置）。

- [ ] **Step 3:** `vp build` / `vp pack` 两包成功。

- [ ] **Step 4:** 更新 `development-roadmap.md` **当前进度** 表中阶段一项为进行中/完成（按需）。

- [ ] **Step 5:** Commit：`chore: phase 1 exports and verification`

---

## 风险与备忘

- **WASM in `vp test`：** Node 下 Yoga/CanvasKit 加载路径与 `locateFile` 必须在测试中复制生产配置；失败时优先 Fix `locateFile` 与 `fetch`/`fs` 读 wasm。
- **react-reconciler 0.33：** `commitUpdate` 等签名与 React 19 对齐；以类型定义为准。
- **CanvasKit API 差异：** `saveLayerPaint` 等以锁定版本文档为准。
- **单子约束：** 与 [runtime-structure-constraints.md](../../runtime-structure-constraints.md) 一致，错误信息带 `[react-canvas]`。

---

## 规格溯源

- [phase-1-design.md](../../phase-1-design.md)
- [2026-04-04-phase-1-clarifications-design.md](../specs/2026-04-04-phase-1-clarifications-design.md)
- [development-roadmap.md](../../development-roadmap.md) 阶段一 Step 1–3
