# Lucide `Icon`（Canvas）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `@react-canvas/ui` 中提供 **`Icon`**，将 Lucide 矢量数据渲染为 **`<SvgPath>`**（及必要时 **`<View>`** 包裹），支持 **按需单文件 import** 以 **tree-shake**，并与 [2026-04-08-ui-icon-lucide-design.md](../specs/2026-04-08-ui-icon-lucide-design.md) 对齐（经 Task 1 修订后）。

**Architecture:** 运行时从 **`@lucide/icons`** 单图标模块的 **默认导出**（`{ name, node, size }`）读取 **`node`（IconNode）**，再经 **`iconNodeToPathPayloads`** 转为若干 **`d` 字符串**（`path` 直出；`circle` 等用少量几何公式转为 `d`），由 **`<SvgPath>`** 绘制。外层 **`<View style={{ width: size, height: size }}>`**（或等价）统一布局盒，命中 **AABB** 与阶段四一致。

**Tech Stack:** `react` 19、`@react-canvas/react`（`View`、`SvgPath`）、**peer `@lucide/icons`**（与实现/测试锁定的 Lucide 主版本一致，例如 **1.7.x**）、`vite-plus` 测试。

**Implementation note（2026-04-08）：** 与规格 §4.2 一致，**多段 `d` 合并为一条** `<SvgPath>`（空格拼接），避免多个兄弟 `SvgPath` 在 Yoga 下纵向排列；视觉与多条子路径等价。

**实现前置发现（须在 Task 1 写入规格）：** 自 `lucide-react` 主入口 `import { Camera } from 'lucide-react'` 得到的 **`LucideIcon` 在运行时没有 `iconNode` 属性**（仅 `$$typeof` / `render`）。因此 **无法**在仅持有 `Camera` 引用时同步拿到 path 数据。可行方案为：

- **推荐（本计划采用）：** **`icon` 使用 `@lucide/icons/icons/<kebab>` 的默认导出**（与 Lucide 官方数据格式一致），**同步**、**可按文件 tree-shake**；`lucide-react` 仍可用于文档站 DOM，**不作为** Canvas `Icon` 的硬依赖。
- **备选（未纳入本计划）：** `LucideIcon` + **`import()` 动态加载** `@lucide/icons/icons/${kebab}` + `Suspense` / `use()`，首帧异步；或用户 **双 import** `__iconNode`（依赖 **非稳定** 深路径）。

---

## 文件结构（计划锁定）

| 文件                                                         | 职责                                                                                                                             |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/components/icon/types.ts`                   | `IconProps`、与 `@lucide/icons` 默认导出兼容的 **`LucideIconData`** 类型（本地定义或 `import type` 若包导出）                    |
| `packages/ui/src/components/icon/icon-node-to-paths.ts`      | `IconNode` → `{ d: string; stroke?: string; fill?: string }[]`；**path** 元素读 `d`；**circle**（及 v1 需要的 **line**）转为 `d` |
| `packages/ui/src/components/icon/icon.tsx`                   | **`Icon`**：`<View><SvgPath … /></View>`；`color` / `stroke` / `fill` 映射与规格一致                                             |
| `packages/ui/src/index.ts`                                   | `export { Icon, type IconProps }`                                                                                                |
| `packages/ui/package.json`                                   | **peerDependencies**：`@lucide/icons`；**devDependencies**：`@lucide/icons`（测试）、`@react-canvas/react` 已有                  |
| `packages/ui/tests/icon-node-to-paths.test.ts`               | 纯函数单测：**仅 path** 与 **path + circle**（Camera 数据形状）                                                                  |
| `docs/superpowers/specs/2026-04-08-ui-icon-lucide-design.md` | Task 1 修订 API 与 peer                                                                                                          |

---

### Task 1: 修订设计规格（API 与 peer）

**Files:**

- Modify: `docs/superpowers/specs/2026-04-08-ui-icon-lucide-design.md`

- [ ] **Step 1: 写入修订**

在 §2「用户可见 API」中，将示例与约束改为 **数据驱动**（与实现发现一致），例如：

```tsx
import camera from "@lucide/icons/icons/camera";
import { Icon } from "@react-canvas/ui";

<Icon icon={camera} size={48} color="red" strokeWidth={1} />;
```

- **`icon`**（必填）：类型为 **`{ name: string; node: IconNode; size?: number }`**（与 `@lucide/icons` 单文件 **default export** 一致；类型名可写作 **`LucideIconData`**）。
- **peer**：**`@lucide/icons`**（**不**将 `lucide-react` 列为 Canvas `Icon` 的必需 peer；文档中说明 DOM 场景可另装 `lucide-react`）。
- 删除或标注废弃「**仅** `icon: LucideIcon`」的表述，避免与运行时能力矛盾。

在 §5「依赖与版本」表格中：**`@lucide/icons`** → **peerDependencies**；**`lucide-react`** → **可选**，仅文档/示例。

- [ ] **Step 2: 自检**

重跑规格 §7 自检条目；确保 **多 path 策略 A**（多条 `SvgPath` + 外层 `View`）仍成立。

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-04-08-ui-icon-lucide-design.md
git commit -m "docs: revise Icon spec for @lucide/icons data API"
```

---

### Task 2: 依赖与类型

**Files:**

- Modify: `packages/ui/package.json`

- [ ] **Step 1: 添加 peer 与 dev 依赖**

在仓库根目录：

```bash
cd packages/ui && vp add -P @lucide/icons && vp add -D @lucide/icons
```

（若 workspace 无 catalog 条目，按项目惯例在 **根 `package.json` `pnpm.catalog`** 增加 `@lucide/icons` 与 `lucide-react` 版本 pin，再执行 `vp add`。）

- [ ] **Step 2: 验证**

`pnpm install` 后 `packages/ui` 中 **能** `import camera from "@lucide/icons/icons/camera"` 且类型检查通过。

- [ ] **Step 3: Commit**

```bash
git add packages/ui/package.json pnpm-lock.yaml pnpm-workspace.yaml package.json
git commit -m "chore(ui): add @lucide/icons as peer and dev dependency"
```

---

### Task 3: `iconNodeToPathPayloads`（纯函数 + 测试）

**Files:**

- Create: `packages/ui/src/components/icon/icon-node-to-paths.ts`
- Create: `packages/ui/tests/icon-node-to-paths.test.ts`

- [ ] **Step 1: 写失败测试**

`packages/ui/tests/icon-node-to-paths.test.ts`：

```ts
import { describe, expect, it } from "vite-plus/test";
import camera from "@lucide/icons/icons/camera";
import { iconNodeToPathPayloads } from "../src/components/icon/icon-node-to-paths.ts";

describe("iconNodeToPathPayloads", () => {
  it("returns one d for path-only icons", () => {
    const payloads = iconNodeToPathPayloads({
      name: "x",
      node: [["path", { d: "M0 0 L10 10", key: "k" }]],
    });
    expect(payloads).toHaveLength(1);
    expect(payloads[0].d).toContain("M0 0");
  });

  it("handles camera icon (path + circle)", () => {
    const payloads = iconNodeToPathPayloads(camera);
    expect(payloads.length).toBeGreaterThanOrEqual(2);
    expect(payloads.every((p) => p.d.length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试（应失败）**

```bash
cd packages/ui && vp test
```

预期：**找不到模块** 或 **函数未定义** → FAIL。

- [ ] **Step 3: 最小实现**

`icon-node-to-paths.ts`：

- 导出 **`iconNodeToPathPayloads(data: { node: IconNode })`**（`IconNode` 类型可从 `lucide-react` 的 `export type { IconNode }` **仅类型** import，或本地复制为 **tuple 数组** 类型）。
- 遍历 `data.node`：
  - **`path`**：取 `attrs.d`，跳过无 `d` 的项并 **不**抛错（可 `onError` 在 Icon 层）。
  - **`circle`**：用 **`cx`/`cy`/`r`**（字符串转 number）生成闭合圆 path **`d`**（两半圆弧或四象限弧，任选一种正确闭合实现）。
  - **`line`**、**`polyline`**、**`polygon`**：v1 可 **`onError` 或跳过**；若 Camera 仅需 **circle**，可先 **只实现 path + circle**。

返回 **`{ d: string }[]`**，stroke/fill 若 Lucide attrs 上有则透传（v1 可忽略，由外层 `Icon` 统一上色）。

- [ ] **Step 4: 运行测试（应通过）**

```bash
cd packages/ui && vp test
```

预期：PASS。

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/icon/icon-node-to-paths.ts packages/ui/tests/icon-node-to-paths.test.ts
git commit -m "feat(ui): add iconNodeToPathPayloads for Lucide IconNode"
```

---

### Task 4: `Icon` 组件与导出

**Files:**

- Create: `packages/ui/src/components/icon/types.ts`
- Create: `packages/ui/src/components/icon/icon.tsx`
- Modify: `packages/ui/src/index.ts`

- [ ] **Step 1: 定义 `IconProps`**

`types.ts`（摘录）：

```ts
import type { InteractionHandlers, ViewStyle } from "@react-canvas/core";

/** 与 `@lucide/icons` 单文件默认导出兼容 */
export type LucideIconData = {
  name: string;
  node: import("lucide-react").IconNode;
  size?: number;
};

export type IconProps = {
  icon: LucideIconData;
  size?: number;
  color?: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  style?: ViewStyle;
  onError?: (error: unknown) => void;
} & InteractionHandlers;
```

若 **`import("lucide-react").IconNode`** 导致 **peer 误解析**，可改为 **本地 IconNode 元组类型**（与 Lucide 文档一致），避免 **runtime** 依赖 `lucide-react`。

- [ ] **Step 2: 实现 `Icon`**

`icon.tsx`：

- `import { View, SvgPath } from "@react-canvas/react"`。
- `const payloads = iconNodeToPathPayloads(icon)`。
- **viewBox**：默认 **`"0 0 24 24"`**；若 `icon.size === 24` 与 Lucide 默认一致，可写死；若将来需变，再从 `data` 扩展。
- **颜色**：若用户传入 **`stroke` / `fill`**，优先；否则 **`color`** → 默认 **`stroke`**（与规格一致）。
- **布局**：**`View`** `style` 合并 **`width`/`height`**：若 **`size`** 存在，**`size × size`**；否则沿用 `style`。
- **子节点**：对每个 payload 渲染 **`<SvgPath d={…} viewBox="0 0 24 24" size={size} stroke={…} fill={…} strokeWidth={…} />`**（`size` 与 `SvgPath` 糖一致）。
- **多 path**：多条 `SvgPath` 叠在同一 `View` 内，**不**再嵌套 `View`（除非测试发现 Yoga 问题；若需，再内层 `View` **100%** 宽高）。

- [ ] **Step 3: 导出**

`packages/ui/src/index.ts`：

```ts
export { Icon } from "./components/icon/icon.tsx";
export type { IconProps, LucideIconData } from "./components/icon/types.ts";
```

- [ ] **Step 4: `vp check`**

```bash
cd /Users/zhouou/Desktop/react-canvas && vp check
```

预期：pass。

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/icon/icon.tsx packages/ui/src/components/icon/types.ts packages/ui/src/index.ts
git commit -m "feat(ui): add Icon component wrapping SvgPath"
```

---

### Task 5: 文档与版本说明

**Files:**

- Modify: `packages/ui/package.json`（`description` 或 README 若存在）
- Optional: `apps/website` 某页一句示例（非必须）

- [ ] **Step 1: 在 `packages/ui` 增加简短 README 片段**（若尚无 README，仅在 `package.json` **description** 中写一句「Icon 需 peer `@lucide/icons`」亦可）

- [ ] **Step 2: Commit**

```bash
git commit -m "docs(ui): document Icon peer @lucide/icons"
```

---

## Self-review（计划作者自检）

| 规格条目                      | 对应任务 |
| ----------------------------- | -------- |
| `SvgPath` 数据流、`View` 包裹 | Task 4   |
| 多 path / circle              | Task 3–4 |
| peer 与版本                   | Task 1–2 |
| 测试                          | Task 3   |

**占位符扫描：** 无 TBD；**circle** 实现必须在 Task 3 代码块中写清公式或引用标准实现。

**类型一致：** `LucideIconData` / `IconProps` 在 Task 4 与导出名一致。

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-08-ui-icon-lucide-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 每个 Task 派生子代理，任务间人工复核，迭代快。

**2. Inline Execution** — 本会话按 Task 顺序执行，配合 executing-plans 的检查点。

**Which approach?**
