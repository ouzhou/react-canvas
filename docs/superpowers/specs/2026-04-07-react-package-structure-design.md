# `@react-canvas/react` 源码与测试目录重构 — 设计规格

**日期：** 2026-04-07  
**状态：** 已定稿（宿主目录名 **A：`hosts/`**）  
**范围：** 仅 **`packages/react`** 内 **`src/`** 与 **`tests/`** 的目录与文件命名整理；**不改变** 包对外导出符号（仍由包根 `src/index.ts` 统一导出）。**不含** 路线图新功能实现（如 ScrollView、Animated），仅预留目录语义。

**参考：** [development-roadmap.md](../../development-roadmap.md)、[@react-canvas/core 目录规格](./2026-04-06-core-package-structure-design.md)（同构镜像测试、`exports` 策略）。

---

## 1. 目标与非目标

### 1.1 目标

- 将当前**扁平**的 `packages/react/src` 按**功能域**分层，与 **`@react-canvas/core`** 的 runtime / input / reconciler 心智对齐，便于按路线图扩展（ScrollView、动画、a11y、FlatList 等）。
- **宿主组件**统一放在 **`hosts/`**（与 React Native「宿主类型」用语一致）。
- **`tests/` 与 `src/` 同构镜像**（与 core 一致）：子目录内测试文件使用 **`../../src/...`** 指向实现（多一层 `..`）。
- 重构后 **`packages/react`：`vp check`、`vp test`** 通过；**不**新增对 `core` 源码路径的 **deep import**（继续只用 `@react-canvas/core` 包入口）。

### 1.2 非目标

- **不**新增 `package.json` 的 `exports` 子路径。
- **不**在本任务中实现阶段四 Step 9（ScrollView / `overflow`）等；若新增文件，仅在规格或注释中预留 **`hosts/scroll-view.tsx`** 等落点。

---

## 2. 源码目录树（目标形态）

```text
packages/react/src/
  index.ts
  jsx-augment.d.ts
  vite-env.d.ts

  canvas/
    canvas.tsx
    canvas-provider.tsx
    canvas-backing-store.ts
    context.ts

  reconciler/
    host-config.ts              # 原 reconciler-config.ts

  hosts/
    view.ts
    text.ts
    image.ts
    svg-path.ts

  input/
    canvas-pointer.ts
```

### 2.1 与路线图的对应关系（预留）

| 路线图能力                            | 建议归属（未来实现时）                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| 阶段四 Step 9：ScrollView、`overflow` | 新增 **`hosts/scroll-view.tsx`**（及必要时 `canvas/` 或 `input/` 扩展滚轮语义） |
| 阶段六：Animated、`Animated.*`        | **`animated/`** 或与 `hosts/` 并列，按实现再定                                  |
| 阶段六：无障碍 Proxy DOM              | **`a11y/`** 或紧邻 `canvas/`                                                    |
| 阶段六：FlatList                      | **`hosts/flat-list.tsx`** + 与 `core` 列表/回收协同                             |

---

## 3. 文件命名对照表

| 当前路径                      | 目标路径                             |
| ----------------------------- | ------------------------------------ |
| `src/canvas.tsx`              | `src/canvas/canvas.tsx`              |
| `src/canvas-provider.tsx`     | `src/canvas/canvas-provider.tsx`     |
| `src/canvas-backing-store.ts` | `src/canvas/canvas-backing-store.ts` |
| `src/context.ts`              | `src/canvas/context.ts`              |
| `src/reconciler-config.ts`    | `src/reconciler/host-config.ts`      |
| `src/view.ts`                 | `src/hosts/view.ts`                  |
| `src/text.ts`                 | `src/hosts/text.ts`                  |
| `src/image.ts`                | `src/hosts/image.ts`                 |
| `src/svg-path.ts`             | `src/hosts/svg-path.ts`              |
| `src/canvas-pointer.ts`       | `src/input/canvas-pointer.ts`        |

**不动：** `jsx-augment.d.ts`（无路径依赖）、`vite-env.d.ts`；**仅更新** `index.ts` 内 re-export 路径。

---

## 4. 测试目录（与 `src` 镜像）

| 当前                                 | 目标                                        |
| ------------------------------------ | ------------------------------------------- |
| `tests/canvas-view.test.tsx`         | `tests/canvas/canvas-view.test.tsx`         |
| `tests/context.test.tsx`             | `tests/canvas/context.test.tsx`             |
| `tests/canvas-backing-store.test.ts` | `tests/canvas/canvas-backing-store.test.ts` |
| `tests/text-host.test.tsx`           | `tests/hosts/text-host.test.tsx`            |

**`tests/setup.ts`** 保留在 **`tests/` 根目录**（`vite.config.ts` 的 `setupFiles` 不变）；其中 **`vi.mock("../../core/src/render/locate.ts")`** 路径已随 core 重构有效，迁移后无需改为 `../../../`（`tests/` 根相对 `packages/react` 未变）。

---

## 5. 包根 `index.ts`

所有 `export ... from "./..."` 改为指向 **`./canvas/...`**、**`./hosts/...`** 等新相对路径；**导出名称不变**。

---

## 6. 验收标准

- `packages/react`：**`vp check`、`vp test`** 全绿。
- 全仓库：无对 `@react-canvas/react` **非入口**路径的稳定依赖（若文档示例写死旧路径，按需更新）。
- 本文 §2～§4 与仓库实际结构一致（实现完成后可修订记录）。

---

## 7. 修订记录

| 日期       | 说明                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 2026-04-07 | 初版：目录树、`hosts/`、测试镜像、`reconciler/host-config.ts` 命名。 |
