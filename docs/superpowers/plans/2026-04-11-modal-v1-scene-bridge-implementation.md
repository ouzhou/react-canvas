# Modal v1（单根双槽 + RN 风格 Modal）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans，按任务逐项执行；步骤用 `- [ ]` 勾选跟踪。

**Goal:** 在 `core-v2` 初始化时固定 `root` 下双子槽 `scene-content` / `scene-modal`，暴露 `getContentRootId` / `getModalRootId`；`react-v2` 将默认 `ParentSceneIdContext` 指向 content 槽，并提供对齐 RN API 的 `<Modal>`（`visible` / `transparent` / `onRequestClose` + 默认全屏背板）。

**Architecture:** `createSceneRuntime` 在返回 `SceneRuntime` 前用固定 id `createChildAt(rootId, …)` 依次插入两子节点并 `insertView` 等价样式（content：`flex: 1`；modal 槽：`position: 'absolute'`, `left`/`top`: 0, `width`/`height`: `'100%'`，`pointerEvents`: `'auto'`）。命中顺序保持「后兄弟优先」，故 modal 槽为第二子节点。React 侧 `Canvas` 默认 Provider 值为 `getContentRootId()`；`<Modal visible>` 时用 Provider 将子树父 id 设为 `getModalRootId()`，并先渲染全屏背板 `View` 再渲染 `children`，背板 `onClick` 触发 `onRequestClose`。

**Tech Stack:** `packages/core-v2`（`scene-runtime.ts`、`node-store.ts` 不变更对外语义，仅扩展初始化）、`packages/react-v2`（`canvas.tsx`、`view.tsx` 模式复用、`modal.tsx` 新建）、`vp test` / `vp check`。

**依据 spec:** `docs/superpowers/specs/2026-04-11-modal-v1-scene-bridge-design.md`

---

## 文件结构（新建 / 修改）

| 路径                                                   | 作用                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `packages/core-v2/src/runtime/scene-runtime.ts`        | 双槽初始化、`SceneRuntime` 增加 `getContentRootId` / `getModalRootId`   |
| `packages/core-v2/src/index.ts`                        | 类型随 `SceneRuntime` 导出（若需）                                      |
| `packages/core-v2/tests/*.test.ts`                     | 若干用例父节点从 `getRootId()` 改为 `getContentRootId()`；新增双槽断言  |
| `packages/react-v2/src/canvas.tsx`                     | `ParentSceneIdContext` 默认值改为 `getContentRootId()`                  |
| `packages/react-v2/src/hooks.ts`                       | 可选：`useSceneRoots()` 返回 `rootId` / `contentRootId` / `modalRootId` |
| `packages/react-v2/src/modal.tsx`                      | 新建 `<Modal>`                                                          |
| `packages/react-v2/src/index.ts`                       | `export { Modal }` 与类型                                               |
| `packages/react-v2/tests/modal.test.tsx`（或扩展现有） | Modal 挂载 smoke、Canvas 默认父 id                                      |
| `apps/v2`                                              | 可选：最小 Modal 交互 demo                                              |

---

### Task 1: Core — 双槽 + API

**Files:**

- Modify: `packages/core-v2/src/runtime/scene-runtime.ts`
- Modify: `packages/core-v2/src/index.ts`（仅当需再导出常量时；默认只扩 `SceneRuntime`）
- Modify: `packages/core-v2/tests/flex-nested.test.ts`、`snapshot.test.ts`、`layout-commit-subscribe.test.ts`、`pointer-hover-dispatch.test.ts`、`scene-runtime-cursor.test.ts`
- Create: `packages/core-v2/tests/scene-dual-slot.test.ts`（推荐独立新文件）

- [ ] **Step 1: 在 `SceneRuntime` 类型上增加方法签名**

在 `scene-runtime.ts` 中 `SceneRuntime` 类型块内、`getRootId` 旁增加：

```ts
getContentRootId(): string;
getModalRootId(): string;
```

固定槽位 id 字符串在本文件顶部定义为常量（与 spec 一致）：

```ts
const SCENE_CONTENT_ID = "scene-content";
const SCENE_MODAL_ID = "scene-modal";
```

- [ ] **Step 2: 在 `createSceneRuntime` 内、`apiRef = {` 赋值之前，插入双槽节点并赋样式**

在已有 `root` / `rootId` 创建之后，使用已有 `store.createChildAt`（**顺序**：先 `SCENE_CONTENT_ID`，再 `SCENE_MODAL_ID`），并对每个节点设置 `viewStyle` + `applyStylesToYoga` + 与 `insertView` 一致的 `rebuildYogaStyle`/`runLayout` 路径。推荐直接复用与 `insertView` 相同的「创建 + 样式」逻辑，避免重复 bug。

样式建议：

- `scene-content`: `{ flex: 1 }`
- `scene-modal`: `{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "auto" }`

若节点已存在（例如将来热重建），应跳过或合并策略与 `insertView` 的 `existing` 分支一致——v1 仅首次创建即可。

- [ ] **Step 3: 在 `apiRef` 实现对象上实现 `getContentRootId` / `getModalRootId`**

二者分别返回 `SCENE_CONTENT_ID` / `SCENE_MODAL_ID` 字符串（与 `createChildAt` 使用的 id 完全一致）。

- [ ] **Step 4: 新增单测 `scene-dual-slot.test.ts`**

`createSceneRuntime` 后断言：

- `rt.getSceneGraphSnapshot().nodes[rt.getRootId()].children` 等于 `["scene-content", "scene-modal"]`（顺序严格）。
- `rt.getContentRootId() === "scene-content"`，`rt.getModalRootId() === "scene-modal"`。

- [ ] **Step 5: 迁移旧测：凡「主界面树」挂在 root 上的，改为挂在 `getContentRootId()`**

将下列文件中作为 `insertView` 第一个参数、且语义为「内容区」的 `rt.getRootId()` 改为 `rt.getContentRootId()`：

- `flex-nested.test.ts`
- `snapshot.test.ts`（注意节点个数变化）
- `layout-commit-subscribe.test.ts`
- `pointer-hover-dispatch.test.ts`
- `scene-runtime-cursor.test.ts`

仍需要直接断言「根」结构时保留 `getRootId()`。

- [ ] **Step 6: 运行并修复**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp test
```

期望：全部通过。

- [ ] **Step 7: Commit**

```bash
git add packages/core-v2/src/runtime/scene-runtime.ts packages/core-v2/tests/
git commit -m "feat(core-v2): scene-content and scene-modal slots with getters"
```

---

### Task 2: React — Canvas 默认父级 + `useSceneRuntime` 辅助（可选）

**Files:**

- Modify: `packages/react-v2/src/canvas.tsx`
- Modify: `packages/react-v2/src/hooks.ts`（可选）

- [ ] **Step 1: 修改 `Canvas` 中 `ParentSceneIdContext.Provider` 的 `value`**

由 `runtime.getRootId()` 改为 `runtime.getContentRootId()`。

- [ ] **Step 2（可选）: 在 `hooks.ts` 增加 `useSceneRoots()`**

```ts
export function useSceneRoots() {
  const rt = useSceneRuntime();
  return {
    rootId: rt.getRootId(),
    contentRootId: rt.getContentRootId(),
    modalRootId: rt.getModalRootId(),
  };
}
```

若 `Modal` 内直接 `useSceneRuntime().getModalRootId()` 即可，可省略本步。

- [ ] **Step 3: 更新 `packages/react-v2/tests/canvas-provider.test.tsx` 或新增测试**

断言：在 `Canvas` 下挂载的 `View` 对应场景父 id 为 `runtime.getContentRootId()`（可通过 mock runtime 或订阅 layout 快照读取——以现有测试风格为准）。

- [ ] **Step 4: `vp test` 与 `vp check`**

```bash
vp test
vp check
```

- [ ] **Step 5: Commit**

```bash
git add packages/react-v2/src/canvas.tsx packages/react-v2/src/hooks.ts packages/react-v2/tests/
git commit -m "feat(react-v2): default ParentSceneId to content root slot"
```

---

### Task 3: React — `<Modal>` 组件

**Files:**

- Create: `packages/react-v2/src/modal.tsx`
- Modify: `packages/react-v2/src/index.ts`

- [ ] **Step 1: 定义 `ModalProps` 与组件骨架**

与 spec 对齐：

- `visible: boolean`
- `children?: ReactNode`
- `transparent?: boolean`（默认 `false`）
- `onRequestClose?: () => void`

`visible === false` 时 `return null`。

- [ ] **Step 2: `visible === true` 时的结构**

```tsx
const rt = useSceneRuntime();
const modalRootId = rt.getModalRootId();
return (
  <ParentSceneIdContext.Provider value={modalRootId}>
    <View
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        backgroundColor: transparent ? "transparent" : "rgba(0,0,0,0.45)",
      }}
      onClick={onRequestClose}
    />
    {children}
  </ParentSceneIdContext.Provider>
);
```

注意：`View` 的 `onClick` 仅在提供 `onRequestClose` 时注册，避免空监听。

- [ ] **Step 3: 从 `modal.tsx` 导出 `Modal`、`ModalProps`，并在 `src/index.ts` 导出**

- [ ] **Step 4: 单测 `packages/react-v2/tests/modal.test.tsx`**

使用与 `canvas-provider.test.tsx` 相同的测试运行时（`@testing-library/react` + mock runtime 若已有模式）：

- `visible={false}` 时不应往 modal 槽插入业务子节点（若难以断言 DOM，可断言 `getSceneGraphSnapshot` 中 `scene-modal` 下仅有背板或无子节点——按项目测试基础设施取舍）。
- `visible={true}` 时至少 smoke：不抛错、子 `View` 可挂载。

最小可行：渲染 `Canvas` + `Modal visible` + 子 `View`，`expect(true).toBe(true)` 作为占位不可；应有一条可失败的具体断言（例如 snapshot 中 modal 槽下节点数 ≥ 1）。

- [ ] **Step 5: `vp test` / `vp check`**

- [ ] **Step 6: Commit**

```bash
git add packages/react-v2/src/modal.tsx packages/react-v2/src/index.ts packages/react-v2/tests/modal.test.tsx
git commit -m "feat(react-v2): Modal with RN-aligned props and modal scene slot"
```

---

### Task 4: 应用层与文档（可选）

**Files:**

- Modify: `apps/v2/src/core-smoke.tsx`（或等价入口）中若使用 `getRootId()` 插入命令式视图，改为 `getContentRootId()`。
- 可选：在 v2 demo 中加「打开 / 关闭 Modal」按钮（验证主界面按钮被背板挡住）。

- [ ] **Step 1: 全局搜索 `getRootId()`**（`apps/v2`、`packages/react-v2`）并按语义替换为 `getContentRootId()`。

- [ ] **Step 2: 手动或 Playwright 打开 `apps/v2` 验证叠放（若本任务包含 UI）**

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(v2): use content root id for demo trees"
```

---

## Spec 对照（自检）

| Spec 章节                                    | 任务覆盖                |
| -------------------------------------------- | ----------------------- |
| §4 双槽次序与样式                            | Task 1                  |
| §4 `getContentRootId` / `getModalRootId`     | Task 1                  |
| §6.1 Canvas 默认 content                     | Task 2                  |
| §6.2 Modal API 与背板                        | Task 3                  |
| §9 测试建议                                  | Task 1 + 3              |
| §10 验收（apps + vp test）                   | Task 4 + 全程 `vp test` |
| §11 迁移（`getRootId` → `getContentRootId`） | Task 1 测、Task 4 应用  |

**刻意不实现（与 spec §2 一致）：** `Layer` / `captureEvents`、`animationType`、`presentationStyle`、`onShow` / `onDismiss` 等。

---

## 执行方式说明

计划已保存至 `docs/superpowers/plans/2026-04-11-modal-v1-scene-bridge-implementation.md`。

**可选执行路径：**

1. **Subagent 驱动（推荐）** — 每任务新开子代理执行，任务间人工或主代理复核；配合 superpowers `subagent-driven-development`。
2. **本会话内顺序执行** — 按 Task 1→4 在同一工作区改代码；大段完成后运行 `vp test` / `vp check`（配合 `executing-plans` 若需要检查点）。

如需从隔离分支开始，可用 superpowers `using-git-worktrees` 建独立 worktree 再执行本计划。
