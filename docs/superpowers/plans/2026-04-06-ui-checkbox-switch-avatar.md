# Checkbox、Switch、Avatar（`@react-canvas/ui`）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `packages/ui` 实现 `Checkbox`、`Switch`、`Avatar` 与内部 `useControllableValue`，并补齐 Starlight `/ui/*` 文档与 `UiPlayground` 案例。

**Architecture:** 受控判定用 **`Object.hasOwn(props, 'checked')`**（避免 `checked={false}` 误判为非受控）；交互统一走 **`InteractionHandlers['onClick']`**，在组件内先更新布尔状态并调用 **`onChange(checked: boolean)`**，再 **`forward`** 用户传入的 **`onClick`**。样式与 **`getButtonStyles`** 同构： **`variants.ts` 纯函数 + 单测**。Avatar 用 **`Image` `onLoad` / `onError`** 与本地状态区分加载成功、失败与占位。

**Tech Stack:** `react` 19、`vite-plus`（`vp test` / `vp check`）、`@react-canvas/core`（`ViewStyle`、`ImageSource`、`InteractionHandlers`）、`@react-canvas/react`（`View`、`Text`、`Image`、`SvgPath`）、现有 **`CanvasToken`**。

**规格来源:** [`docs/superpowers/specs/2026-04-06-ui-checkbox-switch-avatar-design.md`](../specs/2026-04-06-ui-checkbox-switch-avatar-design.md)

---

## 文件与职责

| 路径                                                          | 职责                                                        |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| `packages/ui/src/hooks/use-controllable-value.ts`             | 泛型受控/非受控布尔（及可配置 prop 名），**不**从包入口导出 |
| `packages/ui/tests/use-controllable-value.test.ts`            | hook 行为单测                                               |
| `packages/ui/src/components/checkbox/variants.ts`             | `getCheckboxStyles`、`CheckboxSize`                         |
| `packages/ui/src/components/checkbox/checkbox.tsx`            | `Checkbox` 组件                                             |
| `packages/ui/tests/checkbox-variants.test.ts`                 | `getCheckboxStyles` 断言                                    |
| `packages/ui/src/components/switch/variants.ts`               | `getSwitchStyles`                                           |
| `packages/ui/src/components/switch/switch.tsx`                | `Switch` 组件                                               |
| `packages/ui/tests/switch-variants.test.ts`                   | `getSwitchStyles`                                           |
| `packages/ui/src/components/avatar/variants.ts`               | `getAvatarSize` / `getAvatarStyles`（尺寸、圆角、背景）     |
| `packages/ui/src/components/avatar/resolve-avatar-content.ts` | 纯函数：决定当前层展示（便于测试）                          |
| `packages/ui/src/components/avatar/avatar.tsx`                | `Avatar` 组件                                               |
| `packages/ui/tests/avatar-resolve.test.ts`                    | `resolveAvatarContent` 优先级                               |
| `packages/ui/src/index.ts`                                    | 公开导出与类型                                              |
| `apps/website/astro.config.mjs`                               | Starlight 侧栏增加三项                                      |
| `apps/website/src/content/docs/ui/checkbox.mdx` 等            | 文档                                                        |
| `apps/website/src/content/docs/ui/index.mdx`                  | 概览链接                                                    |
| `apps/website/src/components/UiPlayground.tsx`                | 画布内演示                                                  |

---

### Task 1: `useControllableValue`

**Files:**

- Create: `packages/ui/src/hooks/use-controllable-value.ts`
- Create: `packages/ui/tests/use-controllable-value.test.ts`

**约定:** 受控 = **`Object.hasOwn(props, valuePropName)`**（默认 `'checked'`）。非受控初值来自 **`defaultValuePropName`**（默认 `'defaultChecked'`）或 **`options.defaultValue`**。

- [ ] **Step 1: 写失败测试**（`packages/ui/tests/use-controllable-value.test.ts`）

仓库 **`packages/ui` 未依赖 `@testing-library/react`**，与现有 **`button.test.tsx`** 一致，**只测可纯函数化的行为**。在 **`use-controllable-value.ts` 同文件或 `use-controllable-value-logic.ts`** 导出：

- **`isControlledProp(props, valuePropName)`** → `Object.hasOwn(props, valuePropName)`
- **`getInitialUncontrolledValue<T>(props, defaultValuePropName, fallback)`** — 从 **`props[defaultValuePropName]`** 读取

测试示例（先写测试再实现，TDD）：

```ts
import { describe, expect, it } from "vite-plus/test";
import {
  isControlledProp,
  getInitialUncontrolledValue,
} from "../src/hooks/use-controllable-value.ts";

describe("useControllableValue helpers", () => {
  it("isControlledProp: checked false is still controlled", () => {
    expect(isControlledProp({ checked: false }, "checked")).toBe(true);
    expect(isControlledProp({}, "checked")).toBe(false);
  });

  it("getInitialUncontrolledValue reads defaultChecked", () => {
    expect(getInitialUncontrolledValue({ defaultChecked: true }, "defaultChecked", false)).toBe(
      true,
    );
  });
});
```

Hook 本体 **`useControllableValue`** 可在 Task 1 末尾 **手写一条** `packages/ui/tests/use-controllable-value-hook.test.tsx` 用 **`react-dom/client` `createRoot` + act** 挂载 **仅 10 行** 的测试组件（若你愿意增加 **react-dom** 为 **ui 包 devDependency**）；**否则** Task 1 **仅以 helpers 单测 + Checkbox 集成测试** 覆盖 hook。

- [ ] **Step 2: 运行 `vp test packages/ui`** — 预期：失败。

- [ ] **Step 3: 实现最小 hook + helpers**

`packages/ui/src/hooks/use-controllable-value.ts`:

```ts
import { useCallback, useState } from "react";

export type UseControllableValueOptions<T> = {
  valuePropName?: string;
  defaultValuePropName?: string;
  trigger?: string;
  defaultValue?: T;
};

const defaultValueProp = "defaultValue";
const defaultValueName = "value";

export function useControllableValue<T>(
  props: Record<string, unknown>,
  options: UseControllableValueOptions<T> = {},
): [T, (next: T | ((prev: T) => T)) => void] {
  const valuePropName = options.valuePropName ?? defaultValueName;
  const defaultValuePropName = options.defaultValuePropName ?? defaultValueProp;
  const trigger = options.trigger ?? "onChange";
  const controlled = Object.hasOwn(props, valuePropName);
  const propValue = props[valuePropName] as T;
  const def = (props[defaultValuePropName] as T | undefined) ?? options.defaultValue;
  const [inner, setInner] = useState<T>(() => def as T);
  const value = controlled ? propValue : inner;

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(value) : next;
      if (!controlled) {
        setInner(resolved);
      }
      const fn = props[trigger] as ((v: T) => void) | undefined;
      fn?.(resolved);
    },
    [controlled, props, trigger, value],
  );

  return [value, setValue];
}
```

**Checkbox 映射：** `valuePropName: 'checked'`, `defaultValuePropName: 'defaultChecked'`, `trigger: 'onChange'`。

- [ ] **Step 4: `vp test packages/ui` 与 `vp check`** — 通过。

- [ ] **Step 5: Commit** — `git add packages/ui/src/hooks/use-controllable-value.ts packages/ui/tests/use-controllable-value.test.ts && git commit -m "feat(ui): add useControllableValue hook"`

---

### Task 2: Checkbox（variants + 组件）

**Files:**

- Create: `packages/ui/src/components/checkbox/variants.ts`
- Create: `packages/ui/src/components/checkbox/checkbox.tsx`
- Create: `packages/ui/tests/checkbox-variants.test.ts`

**交互:** **`onClick`** 内：若 **`disabled`** → return；若 **`indeterminate === true`** → **`setValue(true)`**（受控由父改 **`indeterminate`**）；否则 **`setValue(!value)`**。然后 **`userOnClick?.(e)`**。

**视觉:** **`indeterminate`** 优先于 **`checked`**（规格）。勾与横条用 **`SvgPath`** 或 **`View`** 细条（计划：优先 **`SvgPath`** 勾 / **`View` height 2 横条**）。

- [ ] **Step 1: `checkbox-variants.test.ts`** — 断言 `getCheckboxStyles('md', token)` 含 **`width`/`height`**、**`borderColor`**。

- [ ] **Step 2: 实现 `variants.ts`** — `getCheckboxStyles(size, token): ViewStyle`。

- [ ] **Step 3: 实现 `checkbox.tsx`** — `CheckboxProps` 含 **`checked?` `defaultChecked?` `indeterminate?` `disabled?` `size?: 'sm'|'md'` `token?` `style?` `onChange?: (checked: boolean) => void` `children?`** + **`InteractionHandlers`**；**`token`** 必填规则与 **`Button`** 相同（`useContext` + `throw`）。

- [ ] **Step 4: `vp test` + `vp check`**

- [ ] **Step 5: Commit** — `feat(ui): add Checkbox`

---

### Task 3: Switch

**Files:**

- Create: `packages/ui/src/components/switch/variants.ts`
- Create: `packages/ui/src/components/switch/switch.tsx`
- Create: `packages/ui/tests/switch-variants.test.ts`

**结构:** 外层 **`View`**（轨道）+ 内层 **`View`**（滑块），**`checked`** 时 **`transform` 或 `marginLeft`** — 若 **`ViewStyle`** 无 `transform`，用 **`justifyContent: 'flex-end'`** 与固定宽度子视图推动滑块（与现有 `View` 能力对齐；若不支持，用 **`marginLeft` 数值** 计算）。

- [ ] **Step 1–5:** 同 Task 2 模式；**commit** `feat(ui): add Switch`

---

### Task 4: Avatar（resolve + 组件）

**Files:**

- Create: `packages/ui/src/components/avatar/resolve-avatar-content.ts`
- Create: `packages/ui/src/components/avatar/variants.ts`
- Create: `packages/ui/src/components/avatar/avatar.tsx`
- Create: `packages/ui/tests/avatar-resolve.test.ts`

**导出纯函数（示例）:**

```ts
export type AvatarLoadState = "loading" | "loaded" | "error";

export function resolveAvatarVisibleLayer(input: {
  source?: unknown;
  loadState: AvatarLoadState;
  hasIcon: boolean;
  hasChildren: boolean;
}): "image" | "icon" | "text" | "empty" {
  if (input.source && input.loadState === "loaded") return "image";
  if (input.source && input.loadState === "loading") {
    if (input.hasIcon) return "icon";
    if (input.hasChildren) return "text";
    return "empty";
  }
  if (input.source && input.loadState === "error") {
    if (input.hasIcon) return "icon";
    if (input.hasChildren) return "text";
    return "empty";
  }
  if (input.hasIcon) return "icon";
  if (input.hasChildren) return "text";
  return "empty";
}
```

- [ ] **Avatar 组件状态:** `loadState`：`source` 缺失 → `loaded`（无图）；`source` 有 → 初始 **`loading`**，**`onLoad`** → **`loaded`**，**`onError`** → **`error`**。

- [ ] **圆形:** `width`/`height` = `size`，**`borderRadius: size / 2`**（`ViewStyle`）。

- [ ] **Icon:** 复用 **`Icon`** from `../icon/icon.tsx`，**`token`** 传入 **`color`** 与 **`size`**。

- [ ] **Commit** — `feat(ui): add Avatar`

---

### Task 5: 包入口导出

**Files:**

- Modify: `packages/ui/src/index.ts`

- [ ] 导出 **`Checkbox` `Switch` `Avatar`** 及 **`getCheckboxStyles` `getSwitchStyles` `getAvatarStyles`**（或等价命名）、**`CheckboxProps` `SwitchProps` `AvatarProps`**。

- [ ] **`vp pack`**（若 CI 需要）或至少 **`vp check`**。

- [ ] **Commit** — `feat(ui): export Checkbox, Switch, Avatar`

---

### Task 6: 文档站 MDX + 侧栏

**Files:**

- Create: `apps/website/src/content/docs/ui/checkbox.mdx`
- Create: `apps/website/src/content/docs/ui/switch.mdx`
- Create: `apps/website/src/content/docs/ui/avatar.mdx`
- Modify: `apps/website/src/content/docs/ui/index.mdx`
- Modify: `apps/website/astro.config.mjs`（`sidebar` → UI 组件库 增加 3 条）

**每页结构:** frontmatter（`title` / `description`）、`Steps` 说明 **`CanvasThemeProvider`** + **`token`**、链到 **`/playground/ui/`**（或现有 Playground 路径，与 **button** 一致）。

- [ ] **Context7** `starlight` 核对 **`Steps`** import（见 `.cursor/rules/website-starlight-docs.mdc`）。

- [ ] **Commit** — `docs(website): add Checkbox, Switch, Avatar pages`

---

### Task 7: UiPlayground

**Files:**

- Modify: `apps/website/src/components/UiPlayground.tsx`

- [ ] 在 **`UiCanvasContent`**（或新子组件）增加 **Checkbox / Switch / Avatar** 行，**`token={token}`**，受控示例用 **`useState`**。

- [ ] 若有独立 **`/playground/button/`** 路由，确认 **astro** 页面是否需新路由；若 **Playground 单页**，在 **button 文档** 里链的 **playground** 与 **index** 一致即可。

- [ ] **Commit** — `docs(website): demo Checkbox, Switch, Avatar in UiPlayground`

---

### Task 8: 验证

- [ ] 仓库根目录：**`vp check`**
- [ ] **`vp test`**
- [ ] **`vp build`**（或 **`vp run --filter website build`**，以 monorepo 脚本为准）

---

## 规格自检（计划 vs 规格）

| 规格要求                                         | 对应任务                   |
| ------------------------------------------------ | -------------------------- |
| 受控 + 非受控 + `onChange(boolean)`              | Task 1–3                   |
| Checkbox `indeterminate` + 点击 `onChange(true)` | Task 2                     |
| `disabled`                                       | Task 2–3（`onClick` 早退） |
| Avatar 图 / Icon / 文字 + `onError`              | Task 4                     |
| 不引入 ahooks                                    | Task 1 自研                |
| `/ui/*` 文档 + Playground                        | Task 6–7                   |
| 单测                                             | Task 1–4                   |

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-06-ui-checkbox-switch-avatar.md`. Two execution options:**

1. **Subagent-Driven（推荐）** — 每个 Task 派新子代理，任务间人工/代理复核
2. **Inline Execution** — 本会话内按 Task 顺序执行（可配合 `executing-plans`）

**你更倾向哪一种？** 若无需选择，可直接说「开始实现」并从 **Task 1** 做起。
