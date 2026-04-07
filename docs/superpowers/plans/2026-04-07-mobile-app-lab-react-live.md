# Mobile App Lab：react-live TSX 预览 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `/mobile-app-lab` 改为使用 `react-live` 在**全屏 Canvas** 内预览用户 TSX；右上 **textarea + 应用按钮** 提交后更新预览；原版多手机示例移出主渲染路径。

**Architecture:** `LiveProvider` 置于 **`Canvas` 外**（与 `CanvasProvider`、浮动层同属 `react-dom` 树）。预览不直接使用 **`LivePreview` 默认 `Component="div"`**（会破坏 `<Canvas>` 仅允许单个子节点 **`<View>`** 的约束），改为在 **`LiveProvider` 子组件**内用 **`useContext(LiveContext)`** 读取 **`element`**（求值得到的组件），在 **`Canvas` > `View`** 内渲染 **`<El />`**。浮动层用 Tailwind 固定右上，`draft` / `appliedCode` 分离，仅按钮同步。

**Tech Stack:** `apps/website`（Astro + React）、`react-live`（Sucrase 转译）、`@react-canvas/react`（`Canvas`、`View`、`Text`、`ScrollView` 按需注入 scope）、`vp add`。

**规格：** [2026-04-07-mobile-app-lab-react-live-design.md](../specs/2026-04-07-mobile-app-lab-react-live-design.md)

---

## 文件结构（将创建 / 修改）

| 文件                                                                      | 职责                                                                          |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/website/package.json`                                               | 增加 `react-live` 依赖                                                        |
| `apps/website/src/components/MobileAppLab.tsx`                            | 精简为壳：`CanvasProvider`、浮动层、`LiveProvider`、`LabCanvas` 编排          |
| `apps/website/src/components/MobileAppLab.legacy.tsx`（新建，可选但推荐） | 自原 `MobileAppLab.tsx` 剪切全部多手机示例组件，**无任何页面 import**，仅备份 |
| `pnpm-lock.yaml` / 根 `package.json` catalog（若工具改写）                | 锁版本                                                                        |

---

### Task 1: 添加依赖

**Files:**

- Modify: `apps/website/package.json`

- [ ] **Step 1: 安装 react-live**

在项目根目录执行（遵守 AGENTS.md，使用 Vite+）：

```bash
vp add react-live --filter website
```

若 monorepo 的 filter 写法不同，改为在 `apps/website` 目录下 `vp add react-live`。

- [ ] **Step 2: 确认安装**

`apps/website/package.json` 的 `dependencies` 中应出现 `"react-live"` 及可解析版本；执行 `vp install`（若 lockfile 需更新）。

- [ ] **Step 3: Commit**

```bash
git add apps/website/package.json pnpm-lock.yaml
git commit -m "chore(website): add react-live for mobile-app-lab live preview"
```

---

### Task 2: 抽出 legacy 示例（降低主文件体积）

**Files:**

- Create: `apps/website/src/components/MobileAppLab.legacy.tsx`
- Modify: `apps/website/src/components/MobileAppLab.tsx`（删除已迁移的组件定义）

- [ ] **Step 1: 新建 `MobileAppLab.legacy.tsx`**

将当前 `MobileAppLab.tsx` 中 **除** `export function MobileAppLab` 及其直接依赖的 **编排逻辑** 以外的 **所有** 多手机页面组件（如 `ProductDetailPage`、`LabScreenFrame`、`PhoneShell`、常量 `PHONE_W` 等）**剪切**到 `MobileAppLab.legacy.tsx`，并在该文件 **按需 export** 或保持不 export（仅作 Git 历史备份）。**不要**从 `MobileAppLab.tsx` import 此文件。

- [ ] **Step 2: 确认 `MobileAppLab.tsx` 可编译**

主文件暂时保留 `LabCanvas` + `useViewportSize` 等直到 Task 3 重写；若中间状态无法编译，可先保留最小占位 `LabCanvas`。

- [ ] **Step 3: Commit**

```bash
git add apps/website/src/components/MobileAppLab.legacy.tsx apps/website/src/components/MobileAppLab.tsx
git commit -m "refactor(website): move mobile-app-lab showcase to legacy module"
```

---

### Task 3: 实现 LiveProvider + Canvas 内预览（核心）

**Files:**

- Modify: `apps/website/src/components/MobileAppLab.tsx`

**依据（react-live 4.x 行为）：** `LivePreview` 默认用 **`div`** 包裹（见 `LivePreview` 的 `Component` prop，默认 `"div"`）。`<Canvas>` 要求 **唯一子节点为 `<View>`**（见 `packages/react/src/canvas/canvas.tsx` 中 `assertSingleViewChild`）。因此 **不得** 将 `LivePreview` 作为 `Canvas` 的直接子节点；应使用 **`LiveContext`** 中的 **`element`**（类型为实现细节，以包导出为准），在 **`Canvas` > `View`** 内渲染。

- [ ] **Step 1: 定义默认 TSX 字符串常量**

用户代码需求值为 **单根 `@react-canvas/react` 子树**（建议根为 `<View>...</View>`）。示例：

```tsx
const DEFAULT_LAB_TSX = `<View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" }}>
  <Text style={{ fontSize: 18, fontWeight: "600", color: "#0f172a" }}>Hello Mobile Lab</Text>
</View>`;
```

- [ ] **Step 2: 组装 `scope`**

从 `react` 导入 `React`；从 `@react-canvas/react` 导入 **`View`、`Text`**，若默认片段或文档需要再增加 **`ScrollView`、`Image`、Canvas 子组件** 等。**不要**注入未在默认片段中使用的庞大 API，除非有明确需求。

- [ ] **Step 3: 实现 `LiveProvider` 子组件 `LabLiveCanvas`（名称可自拟）**

- `useContext(LiveContext)`（从 `react-live` 导入 **`LiveContext`**；若类型未导出，使用类型断言或查阅包内 `.d.ts`）。
- 从 context 读取 **`element`**（或包文档中的等价字段名）与 **`error`**（用于与浮动层或 `LiveError` 对齐）。
- 返回值结构示意：

```tsx
function LabLiveCanvas({ width, height, canvasRef, viewport, setViewport }: LabCanvasProps) {
  const live = useContext(LiveContext);
  const El = live?.element as React.ElementType | undefined;

  // 复用现有 attachViewportHandlers / attachInspectorHandlers 的 useLayoutEffect（与原 LabCanvas 一致）
  return (
    <>
      <Canvas width={width} height={height} canvasRef={canvasRef} camera={viewport}>
        <View style={{ flex: 1, backgroundColor: "#f1f5f9" }}>
          {El ? <El /> : null}
        </View>
      </Canvas>
      <InspectorHighlight ... />
    </>
  );
}
```

若运行时 **`element` 为 `undefined`** 且 **`error` 有值**，画布区域可为空，错误交给 `LiveError` 展示。

- [ ] **Step 4: 外层包裹 `LiveProvider`**

在 `CanvasProvider` 已就绪分支中，结构类似：

```tsx
<LiveProvider
  code={appliedCode}
  scope={{ React, View, Text, ScrollView, ... }}
  language="tsx"
  enableTypeScript
>
  <div className="... relative h-full w-full">
    <FloatingEditor draft={draft} setDraft={setDraft} onApply={() => setAppliedCode(draft.trim())} />
    <LabLiveCanvas ... />
    <LiveError className="..." />
  </div>
</LiveProvider>
```

**注意：** `LiveError` 为 DOM `pre`，放在 **`Canvas` 外**（与现布局兼容）。

- [ ] **Step 5: 状态**

`useState`：`draft`、`appliedCode`，初始均为 `DEFAULT_LAB_TSX`。

- [ ] **Step 6: 运行 `vp check`**

```bash
vp check
```

期望：无 TypeScript / lint 错误。

- [ ] **Step 7: Commit**

```bash
git add apps/website/src/components/MobileAppLab.tsx
git commit -m "feat(website): wire react-live LiveProvider to Canvas for mobile-app-lab"
```

---

### Task 4: 右上浮动层（textarea + 按钮）

**Files:**

- Modify: `apps/website/src/components/MobileAppLab.tsx`（或拆小组件 `MobileAppLabToolbar.tsx`）

- [ ] **Step 1: UI**

- `position: fixed`，`top` / `right` / `z-index` **高于** 现有「文档首页」链接与左上提示（例如 `z-[100]`）。
- **`<textarea>`**：`className` 含 `font-mono text-xs`，受控 `draft`，`rows` 约 8–12。
- **`<button type="button">`**：文案「应用」或「运行」，`onClick` 调用 `setAppliedCode(draft.trim())`。
- 容器：`rounded-lg border bg-white/95 p-2 shadow-md`，宽度 `max-w-md` 左右。

- [ ] **Step 2: 可访问性**

按钮具备可读 `aria-label`；textarea 可有 `aria-label="TSX 代码"`。

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(website): add floating TSX editor for mobile-app-lab"
```

---

### Task 5: 清理与文档字符串

- [ ] **Step 1: 移除未使用 import**（原 `MobileAppLab` 中仅保留新流程所需）。

- [ ] **Step 2: 确认 `mobile-app-lab.astro` 无需改**（仍 `client:load` 同一组件名即可）。

- [ ] **Step 3: 将规格 [2026-04-07-mobile-app-lab-react-live-design.md](../specs/2026-04-07-mobile-app-lab-react-live-design.md) 头部 **状态** 改为 **已实现\*\*（实现验收通过后）。

---

### Task 6: 手动验收

- [ ] **Step 1: 启动文档站**

```bash
vp dev --filter website
```

浏览器打开 `/mobile-app-lab`（端口以终端为准）。

- [ ] **Step 2: 功能**

- 首屏默认文案「Hello Mobile Lab」出现在画布区域。
- 修改 TSX（例如改 `Text` 内容）→ 点「应用」→ 画布更新。
- 故意写错语法 → 可见错误（`LiveError` 或 context `error`）。

- [ ] **Step 3: 视口 / Inspector**

- Cmd/Ctrl + 滚轮缩放、Cmd/Ctrl + 左键拖拽平移仍可用（与原 `LabCanvas` 行为一致）。
- 悬停 inspector 描边仍可用（若仍挂载在同一 `canvasRef`）。

- [ ] **Step 4: 记录**

若发现 `LiveContext.element` 与类型定义不一致，在 PR 描述中备注 **react-live 版本** 与处理方式。

---

## 规格覆盖自检

| 规格章节                                       | 对应任务                                             |
| ---------------------------------------------- | ---------------------------------------------------- |
| react-live、TSX、scope                         | Task 1、3                                            |
| 全画布仅用户预览、无原版开关                   | Task 2、3                                            |
| 浮动层 textarea + 按钮、点按更新               | Task 4                                               |
| 默认片段                                       | Task 3                                               |
| Canvas 集成风险（不用默认 LivePreview 包 div） | Task 3（LiveContext + `Canvas` > `View` > `<El />`） |
| 依赖 vp add                                    | Task 1                                               |
| 手动测试                                       | Task 6                                               |

---

## 执行交接

Plan complete and saved to `docs/superpowers/plans/2026-04-07-mobile-app-lab-react-live.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach do you want?
