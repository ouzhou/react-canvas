# @react-canvas/ui 第一阶段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务顺序执行；步骤使用 `- [ ]` 勾选。每完成一个 **Task** 建议 `git commit` 一次。验证统一用 **`vp`**（见根目录 `AGENTS.md`）。测试断言从 **`vite-plus/test`** 导入。

**Goal:** 在 `packages/ui` 实现 [2026-04-05-react-canvas-ui-phase-1-design.md](../specs/2026-04-05-react-canvas-ui-phase-1-design.md)：**`CanvasThemeProvider` / `useCanvasToken` / `getCanvasToken`**、**seed + default/dark/compact 算法**（顺序 **default → compact → dark**）、**token 与 theme 配置深度合并**、**`mergeViewStyles` / `resolveSx` / `SxCanvas`**、**最小 `Button`**、**`packages/ui/README.md`**，并使 **`vp check` / `vp test` / `vp pack`** 通过。

**Architecture:** 主题为 **纯对象**；**`getCanvasToken(config)`** 为单一解析入口（供 Provider 与测试复用）。**嵌套 Provider** 先将 **父级 `CanvasThemeConfig`** 与 **子级 `theme`** 做 **`mergeThemeConfig`**，再 **`getCanvasToken`**。**`darkAlgorithm`** 的输入为 **已应用 default + compact 后的 `CanvasToken`**（仍为浅色语义基线），输出 **`Partial<CanvasToken>`** 作为暗色覆盖层。**`Button`** 为函数组件，基于 **`@react-canvas/react`** 的 **`View`** 与 **`@react-canvas/core`** 的 **`ViewStyle`**。

**Tech Stack:** React 19、`@react-canvas/react`、`@react-canvas/core`（**`ViewStyle` 类型与样式键**）、`vite-plus`（pack / test / check）；**不**引入 antd、MUI、css-in-js、运行时 Tailwind。

**前置阅读:** [2026-04-05-react-canvas-ui-phase-1-design.md](../specs/2026-04-05-react-canvas-ui-phase-1-design.md)、[react-canvas-ui-design.md](../../ui/react-canvas-ui-design.md)、[known-limitations.md](../../known-limitations.md)。

---

## 文件结构（计划新增 / 修改）

| 路径                                            | 职责                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/package.json`                      | 增加 **`@react-canvas/core`** `workspace:*`（**devDependency**，类型与 `ViewStyle`）；**`react-dom`**（**devDependency**，与 `packages/react/tests` 一致，供 Provider 测试）；**`@types/react-dom`**（catalog）。**peer** 保持 `react` + `@react-canvas/react`。                                                                                                                                                |
| `packages/ui/vite.config.ts`                    | 增加 **`test.environment: "jsdom"`**、**`test.setupFiles: ["./tests/setup.ts"]`**；**`pack.deps.neverBundle`**：`react`、`react/jsx-runtime`、`@react-canvas/react`、`@react-canvas/core`（与 `packages/react` 对齐，避免误打进库）。                                                                                                                                                                           |
| `packages/ui/tests/setup.ts`                    | 设置 **`IS_REACT_ACT_ENVIRONMENT`**（与 `packages/react/tests/setup.ts` 一致）；**不** mock canvaskit（`ui` 不加载 WASM）。                                                                                                                                                                                                                                                                                     |
| `packages/ui/src/theme/types.ts`                | **`SeedToken`**、**`CanvasToken`**（**`export interface CanvasToken`** 以便 **`declare module` 扩充**）、**`CanvasThemeConfig`**、**`ComponentTokenMap`**（首版 **`Button` 键** 即可）。                                                                                                                                                                                                                        |
| `packages/ui/src/theme/seed.ts`                 | **`DEFAULT_SEED`**：满足 **`defaultAlgorithm`** 所需字段的最小 **seed**。                                                                                                                                                                                                                                                                                                                                       |
| `packages/ui/src/theme/merge-config.ts`         | **`mergeThemeConfig(parent, child): CanvasThemeConfig`**：`seed` 深度合并；**`appearance` / `density`** 子级若 **非 `undefined`** 则覆盖；**`components`** 按 key 深度合并。                                                                                                                                                                                                                                    |
| `packages/ui/src/theme/merge-token.ts`          | **`mergeCanvasToken(base, patch): CanvasToken`**：对 **普通字段** 做 **浅覆盖**；对 **`components`** 做 **按 key 递归合并**（与 spec 一致）。                                                                                                                                                                                                                                                                   |
| `packages/ui/src/theme/algorithms.ts`           | **`defaultAlgorithm(seed: SeedToken): CanvasToken`**；**`compactAlgorithm(token: CanvasToken): Partial<CanvasToken>`**；**`darkAlgorithm(token: CanvasToken): Partial<CanvasToken>`**（输入为 **default+compact 后** 的亮色 token）。                                                                                                                                                                           |
| `packages/ui/src/theme/get-canvas-token.ts`     | **`getCanvasToken(config: CanvasThemeConfig): CanvasToken`**：默认 **`appearance: 'light'`**、**`density: 'default'`**；流程：`mergedSeed` → **`defaultAlgorithm`** → 若 **`density === 'compact'`** 则 **`mergeCanvasToken(..., compactAlgorithm(...))`** → 若 **`appearance === 'dark'`** 则 **`mergeCanvasToken(..., darkAlgorithm(...))`** → 若有 **`components`** 则按约定合并进 token（见 Task 内规则）。 |
| `packages/ui/src/theme/context.tsx`             | **`CanvasThemeContext`**、**`CanvasThemeProvider`**（读取父 context，**`mergeThemeConfig`** + **`useMemo` + `getCanvasToken`**）、**`useCanvasToken()`**（无 Provider 时 **抛错** 或 **返回默认 token** — 计划采用 **抛错**，与常见 `useContext` 模式一致；测试用 Provider 包裹）。                                                                                                                             |
| `packages/ui/src/theme/use-canvas-token.ts`     | 若与 `context.tsx` 同文件导出可省略；否则薄 re-export。                                                                                                                                                                                                                                                                                                                                                         |
| `packages/ui/src/style/merge.ts`                | **`mergeViewStyles(...styles)`**：参数展平（**`undefined` 跳过**、**嵌套数组展开**），**后者覆盖前者**（**`Object.assign` 从左到右**）。                                                                                                                                                                                                                                                                        |
| `packages/ui/src/style/sx.ts`                   | **`SxCanvas`** 类型；**`resolveSx(token, sx): ViewStyle`**。                                                                                                                                                                                                                                                                                                                                                    |
| `packages/ui/src/components/button/variants.ts` | **`getButtonVariantStyle(variant, size, token): Partial<ViewStyle>`** 或 **`Record` + lookup**。                                                                                                                                                                                                                                                                                                                |
| `packages/ui/src/components/button/button.tsx`  | **`Button`**：`mergeViewStyles`**(base, variant, disabled, props.style)**；**`disabled`**：`opacity` / **`pointerEvents: 'none'`**（与 design 一致）。                                                                                                                                                                                                                                                          |
| `packages/ui/src/types/augment.ts`              | **短注释**：如何通过 **`declare module`** 扩充 **`CanvasToken`**（无占位代码块外的 TBD）。                                                                                                                                                                                                                                                                                                                      |
| `packages/ui/src/index.ts`                      | 导出公开 API。                                                                                                                                                                                                                                                                                                                                                                                                  |
| `packages/ui/README.md`                         | 算法顺序、**`darkAlgorithm` 输入**、与 **known-limitations** 边界、**merge 与 RN 差异**（浅合并、不处理嵌套 transform 数组等 — 如实写）。                                                                                                                                                                                                                                                                       |
| `packages/ui/tests/*.test.ts` / `.tsx`          | 见各 Task。                                                                                                                                                                                                                                                                                                                                                                                                     |

---

### Task 1: 依赖与 Vitest / Pack 配置

**Files:**

- Modify: `packages/ui/package.json`
- Modify: `packages/ui/vite.config.ts`
- Create: `packages/ui/tests/setup.ts`

- [ ] **Step 1:** 在 `packages/ui/package.json` 的 **`devDependencies`** 中加入 **`"@react-canvas/core": "workspace:*"`**、**`"react-dom": "catalog:"`**、**`"@types/react-dom": "catalog:"`**（版本与根 **catalog** 一致）。**不要**把 **`react-dom`** 放进 **dependencies** 或 **peerDependencies**。

- [ ] **Step 2:** 在仓库根执行 **`vp install`**（Vite+ 规则），确保 lockfile 更新。

- [ ] **Step 3:** 将 `packages/ui/vite.config.ts` 调整为与下面等价（保留原有 **`pack.dts`**、**`lint`**、**`fmt`**；若已有 **`ignorePatterns`** 则合并）：

```typescript
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
    deps: {
      neverBundle: ["react", "react/jsx-runtime", "@react-canvas/react", "@react-canvas/core"],
    },
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

- [ ] **Step 4:** 新建 `packages/ui/tests/setup.ts`：

```typescript
import { vi } from "vite-plus/test";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
```

（若后续需要 **`afterEach` 清理 DOM**，再追加；首版可仅上述一行。）

- [ ] **Step 5:** 运行 **`cd packages/ui && vp check`**。**期望：** 通过。

- [ ] **Step 6:** Commit：`chore(ui): add core/react-dom dev deps and vitest jsdom setup`

---

### Task 2: `SeedToken` / `CanvasToken` / `CanvasThemeConfig`

**Files:**

- Create: `packages/ui/src/theme/types.ts`
- Create: `packages/ui/src/theme/seed.ts`
- Modify: `packages/ui/src/index.ts`（仅 re-export 类型，或留到 Task 8 统一导出）

- [ ] **Step 1:** 新建 `packages/ui/src/theme/types.ts`，至少包含（字段名可微调，但 **Task 3～5 须用同一套**）：

```typescript
/**
 * 应用可通过 declare module 合并扩充（见 types/augment.ts）。
 */
export interface SeedToken {
  colorPrimary: string;
  borderRadius: number;
}

export interface CanvasToken {
  colorPrimary: string;
  colorBgLayout: string;
  colorText: string;
  colorBorder: string;
  borderRadius: number;
  paddingSM: number;
  paddingMD: number;
  fontSizeSM: number;
  fontSizeMD: number;
  components?: ComponentTokenMap;
}

export interface ComponentTokenMap {
  Button?: Partial<CanvasToken>;
}

export type Appearance = "light" | "dark";

export type Density = "default" | "compact";

export interface CanvasThemeConfig {
  seed?: Partial<SeedToken>;
  appearance?: Appearance;
  density?: Density;
  components?: ComponentTokenMap;
}
```

- [ ] **Step 2:** 新建 `packages/ui/src/theme/seed.ts`：

```typescript
import type { SeedToken } from "./types.ts";

export const DEFAULT_SEED: SeedToken = {
  colorPrimary: "#1677ff",
  borderRadius: 6,
};
```

- [ ] **Step 3:** **`cd packages/ui && vp check`**。**期望：** 通过。

- [ ] **Step 4:** Commit：`feat(ui): add theme SeedToken, CanvasToken, CanvasThemeConfig`

---

### Task 3: `mergeThemeConfig` 与 `mergeCanvasToken`

**Files:**

- Create: `packages/ui/src/theme/merge-config.ts`
- Create: `packages/ui/src/theme/merge-token.ts`
- Create: `packages/ui/tests/merge-theme.test.ts`

- [ ] **Step 1:** 实现 **`mergeThemeConfig`**：对 **`seed`** 做 **一层深度**（仅 **`Partial<SeedToken>` 的键**）；**`appearance`**：若 **`child.appearance !== undefined`** 则用子，否则父；**`density`** 同理；**`components`**：调用 **`mergeCanvasToken`** 风格的 **按 key 合并**（或专写 **`mergeComponentMap`**）。

- [ ] **Step 2:** 实现 **`mergeCanvasToken(base, patch)`**：**`{ ...base, ...patch }`** 对 **标量**；**`components`**：**递归**合并 **`Button`** 等 key。

- [ ] **Step 3:** 编写测试 `packages/ui/tests/merge-theme.test.ts`：断言 **子覆盖 appearance**、**seed 深度合并**、**components.Button** 部分字段覆盖。

```typescript
import { describe, expect, it } from "vite-plus/test";
import { mergeThemeConfig } from "../src/theme/merge-config.ts";
import type { CanvasThemeConfig } from "../src/theme/types.ts";

describe("mergeThemeConfig", () => {
  it("child overrides appearance", () => {
    const parent: CanvasThemeConfig = { appearance: "light" };
    const child: CanvasThemeConfig = { appearance: "dark" };
    expect(mergeThemeConfig(parent, child).appearance).toBe("dark");
  });
});
```

- [ ] **Step 4:** **`cd packages/ui && vp test`**。**期望：** 全部通过。

- [ ] **Step 5:** Commit：`feat(ui): mergeThemeConfig and mergeCanvasToken`

---

### Task 4: `defaultAlgorithm` / `compactAlgorithm` / `darkAlgorithm`

**Files:**

- Create: `packages/ui/src/theme/algorithms.ts`
- Create: `packages/ui/tests/algorithms.test.ts`

- [ ] **Step 1:** 实现 **`defaultAlgorithm(seed: SeedToken): CanvasToken`**：从 **`seed.colorPrimary` / `seed.borderRadius`** 推导 **`colorBgLayout`、文字色、边框色、padding*、fontSize*`**（**硬编码合理默认值**即可，**不**求与设计稿像素级一致）。

- [ ] **Step 2:** 实现 **`compactAlgorithm(token)`**：返回 **`paddingSM` / `paddingMD` / `fontSizeSM` / `fontSizeMD`** 等 **略小** 的 **Partial**。

- [ ] **Step 3:** 实现 **`darkAlgorithm(token)`**：基于 **当前 token** 将 **背景/文字/边框** 换为 **暗色板**（**简单字符串替换或 HSL 工具函数**均可；**保持纯函数、无 I/O**）。

- [ ] **Step 4:** 测试： **`compactAlgorithm`** 在 **`defaultAlgorithm(DEFAULT_SEED)`** 上 **减小** padding；**`darkAlgorithm`** 改变 **`colorBgLayout`**。

- [ ] **Step 5:** **`vp test`**。**期望：** 通过。

- [ ] **Step 6:** Commit：`feat(ui): theme algorithms (default, compact, dark)`

---

### Task 5: `getCanvasToken`

**Files:**

- Create: `packages/ui/src/theme/get-canvas-token.ts`
- Create: `packages/ui/tests/get-canvas-token.test.ts`

- [ ] **Step 1:** 合并 **seed**：**`{ ...DEFAULT_SEED, ...config.seed }`**（**seed 键**）。

- [ ] **Step 2:** **`let token = defaultAlgorithm(mergedSeed)`**。

- [ ] **Step 3:** 若 **`config.density === 'compact'`**（默认 **`'default'`**）：**`token = mergeCanvasToken(token, compactAlgorithm(token))`**。

- [ ] **Step 4:** 若 **`config.appearance === 'dark'`**（默认 **`'light'`**）：**`token = mergeCanvasToken(token, darkAlgorithm(token))`**。

  **注意：** **`darkAlgorithm`** 的实参 **必须是 Step 2～3 之后** 的 **`token`**（已含 compact），满足 spec「输入为已解析亮色 …（在叠暗色之前）」——即 **default+compact 后的完整 token**。

- [ ] **Step 5:** 若 **`config.components`**：将 **`components.Button`** 等 **合并进** **`token.components`**（**`mergeCanvasToken`** 或 **专向 helper**）。

- [ ] **Step 6:** 测试用例：**仅 light + default**；**light + compact**（padding 变小）；**dark + default**；**dark + compact**（顺序验证：**compact 在 dark 之前** — 断言 **某字段** 同时受两者影响，例如 **先 compact 再 dark** 时 **数值与仅 dark** 不同）。

```typescript
import { describe, expect, it } from "vite-plus/test";
import { getCanvasToken } from "../src/theme/get-canvas-token.ts";

describe("getCanvasToken", () => {
  it("dark changes background", () => {
    const dark = getCanvasToken({ appearance: "dark" });
    const light = getCanvasToken({ appearance: "light" });
    expect(dark.colorBgLayout).not.toBe(light.colorBgLayout);
  });
});
```

- [ ] **Step 7:** **`vp test`**。**期望：** 通过。

- [ ] **Step 8:** Commit：`feat(ui): getCanvasToken pipeline`

---

### Task 6: `CanvasThemeProvider` 与 `useCanvasToken`

**Files:**

- Create: `packages/ui/src/theme/context.tsx`
- Create: `packages/ui/tests/theme-provider.test.tsx`

- [ ] **Step 1:** 定义 **`CanvasThemeContext`**，值类型 **`{ config: CanvasThemeConfig }`**（或 **`CanvasToken` + config** — 推荐存 **`config`**，**`useMemo` 计算 token`**，避免 stale）。

- [ ] **Step 2:** **`CanvasThemeProvider`**：**`theme: CanvasThemeConfig`** prop；**父级**若存在则 **`mergeThemeConfig(parent.config, theme)`**，否则 **`theme`**；**`const token = useMemo(() => getCanvasToken(merged), [merged])`**；**Context** 再提供 **`token`**（**`useCanvasToken` 只读 token**）。

  **实现提示：** **`useContext` + 默认值 `undefined`**；无父级时 **`merged = theme`**。

- [ ] **Step 3:** **`useCanvasToken(): CanvasToken`**：若 **无 Provider**（约定：用 **`useContext` 与 `null`** 判断）则 **`throw new Error("useCanvasToken must be used within CanvasThemeProvider")`**。

- [ ] **Step 4:** 测试： **`createRoot` + `act`**（与 `packages/react/tests/context.test.tsx` 相同模式），**渲染** **`<CanvasThemeProvider theme={{ appearance: 'dark' }}><Probe /></CanvasThemeProvider>`**，**`Probe`** 调用 **`useCanvasToken()`** 并 **挂到 ref / 全局变量**，断言 **`colorBgLayout`** 为 **暗色**。

```typescript
import { describe, expect, it } from "vite-plus/test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useRef } from "react";
import { CanvasThemeProvider } from "../src/theme/context.tsx";
import { useCanvasToken } from "../src/theme/context.tsx";
import type { CanvasToken } from "../src/theme/types.ts";

describe("CanvasThemeProvider", () => {
  it("provides dark token", async () => {
    const tokenRef: { current: CanvasToken | null } = { current: null };
    function Probe() {
      tokenRef.current = useCanvasToken();
      return null;
    }
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    await act(async () => {
      root.render(
        <CanvasThemeProvider theme={{ appearance: "dark" }}>
          <Probe />
        </CanvasThemeProvider>,
      );
    });
    expect(tokenRef.current?.colorBgLayout).toBeDefined();
    root.unmount();
    el.remove();
  });
});
```

（**导入路径**以实际导出为准；可将 **`useCanvasToken`** 从 **`use-canvas-token.ts`** 导出。）

- [ ] **Step 5:** 嵌套测试：**外层 light**、**内层 dark**，断言 **内层** **`useCanvasToken`** 为 **dark**。

- [ ] **Step 6:** **`vp test`**。**期望：** 通过。

- [ ] **Step 7:** Commit：`feat(ui): CanvasThemeProvider and useCanvasToken`

---

### Task 7: `mergeViewStyles`

**Files:**

- Create: `packages/ui/src/style/merge.ts`
- Create: `packages/ui/tests/merge-view-styles.test.ts`

- [ ] **Step 1:** 实现：

```typescript
import type { ViewStyle } from "@react-canvas/core";

export function mergeViewStyles(...styles: Array<ViewStyle | undefined | ViewStyle[]>): ViewStyle {
  const flat: ViewStyle[] = [];
  for (const s of styles) {
    if (s === undefined) continue;
    if (Array.isArray(s)) flat.push(...(s.map((x) => x).filter(Boolean) as ViewStyle[]));
    else flat.push(s);
  }
  return Object.assign({}, ...flat);
}
```

（**`filter(Boolean)`** 若与 **strict** 冲突，改为 **显式跳过 undefined**。）

- [ ] **Step 2:** 测试：**后者覆盖前者**；**嵌套数组** 展平。

- [ ] **Step 3:** **`vp test`**。**期望：** 通过。

- [ ] **Step 4:** Commit：`feat(ui): mergeViewStyles`

---

### Task 8: `SxCanvas` 与 `resolveSx`

**Files:**

- Create: `packages/ui/src/style/sx.ts`
- Create: `packages/ui/tests/resolve-sx.test.ts`

- [ ] **Step 1:**

```typescript
import type { ViewStyle } from "@react-canvas/core";
import type { CanvasToken } from "../theme/types.ts";
import { mergeViewStyles } from "./merge.ts";

export type SxCanvas = ViewStyle | ((token: CanvasToken) => ViewStyle) | SxCanvas[] | undefined;

export function resolveSx(token: CanvasToken, sx: SxCanvas): ViewStyle {
  if (sx === undefined) return {};
  if (Array.isArray(sx)) {
    return mergeViewStyles(...sx.map((item) => resolveSx(token, item)));
  }
  if (typeof sx === "function") {
    return sx(token);
  }
  return sx;
}
```

- [ ] **Step 2:** 测试：**函数分支**、**数组分支**、**与 mergeViewStyles 顺序**。

- [ ] **Step 3:** **`vp test`**。**期望：** 通过。

- [ ] **Step 4:** Commit：`feat(ui): SxCanvas and resolveSx`

---

### Task 9: `Button` 与 variants

**Files:**

- Create: `packages/ui/src/components/button/variants.ts`
- Create: `packages/ui/src/components/button/button.tsx`
- Create: `packages/ui/tests/button.test.tsx`

- [ ] **Step 1:** **`variants.ts`**：导出 **`buttonVariantStyles: Record<string, Record<string, Partial<ViewStyle>>>`** 或 **函数** **`getButtonStyles(variant, size, token)`**，**primary** 使用 **`token.colorPrimary`** 作为 **背景**（**`backgroundColor`**）。

- [ ] **Step 2:** **`ButtonProps`**：**`variant?: 'primary' | 'ghost'`**、**`size?: 'sm' | 'md'`**、**`disabled?: boolean`**、**`style?: ViewStyle`**、**`children?: React.ReactNode`**，以及 **`InteractionHandlers`**（从 **`@react-canvas/core`** **`import type { InteractionHandlers }`**）**交叉类型**。

- [ ] **Step 3:** **`Button`** 实现：

```typescript
import { View } from "@react-canvas/react";
import type { ViewStyle } from "@react-canvas/core";
import { mergeViewStyles } from "../../style/merge.ts";
import { useCanvasToken } from "../../theme/context.tsx";
import { getButtonStyles } from "./variants.ts";

export function Button(props: ButtonProps) {
  const token = useCanvasToken();
  const { variant = "primary", size = "md", disabled, style, children, ...handlers } = props;
  const base: ViewStyle = {
    paddingHorizontal: token.paddingMD,
    paddingVertical: token.paddingSM,
    borderRadius: token.borderRadius,
    alignItems: "center",
    justifyContent: "center",
  };
  const merged = mergeViewStyles(
    base,
    getButtonStyles(variant, size, token),
    disabled ? { opacity: 0.5 } : {},
    style,
  );
  return (
    <View style={merged} {...handlers}>
      {children}
    </View>
  );
}
```

（**若 `View` 不支持 `children` 展示文字** 仅影响 demo；**阶段二前** **Button** 可 **无 children 内容** 或 **仅布局占位** — **spec 要求最小 Button**，**测试** 可只断言 **style** **合并** 与 **挂载**，**不**断言文本绘制。）

**修正：** `View` **可** **children** 为 **空** 或 **其他 View**；若 **Button** **需** **展示文字**，须 **`<Text>`**（阶段二）。首版 **Button** **children** **可为空** **或** **嵌套** **仅 View**。**README** 说明 **文字需阶段二 `<Text>`**。

- [ ] **Step 4:** 测试：**`CanvasThemeProvider`** 包裹 **`Button`**，**`vp test`** **断言** **`style`** **含** **`backgroundColor`**（**primary**）。

- [ ] **Step 5:** **`vp check`**。**期望：** 通过。

- [ ] **Step 6:** Commit：`feat(ui): Button with variants and token styles`

---

### Task 10: 公开 API、`augment` 注释、删除占位导出

**Files:**

- Modify: `packages/ui/src/index.ts`
- Create: `packages/ui/src/types/augment.ts`
- Modify: `packages/ui/tests/index.test.ts`（更新或删除 **packageName** **单测**）

- [ ] **Step 1:** **`packages/ui/src/index.ts`** 导出：**`CanvasThemeProvider`**、**`useCanvasToken`**、**`getCanvasToken`**、**`mergeViewStyles`**、**`resolveSx`**、**`Button`**、**类型** **`CanvasToken`**、**`SeedToken`**、**`CanvasThemeConfig`**、**`SxCanvas`**、**`DEFAULT_SEED`**（若公开）、**算法函数**（若希望可测试 **tree-shaking** 可导出 **defaultAlgorithm** 等 — **可选**，**YAGNI** 则 **不**导出 **内部算法**，仅 **文档** 说明 **顺序**）。

  **推荐最小公开面：** **Provider**、**hooks**、**getCanvasToken**、**merge**、**resolveSx**、**Button**、**类型**、**DEFAULT_SEED**。

- [ ] **Step 2:** **`packages/ui/src/types/augment.ts`**：

```typescript
/**
 * 应用侧可扩充 CanvasToken（interface 合并）：
 *
 * declare module "@react-canvas/ui" {
 *   interface CanvasToken {
 *     myBrandColor?: string;
 *   }
 * }
 *
 * 需在 tsconfig 中包含该声明文件；具体以项目配置为准。
 */
export {};
```

（**若** **package** **无** **`declare module '@react-canvas/ui'`** **的** **类型入口**，**仅** **注释** **即可** — **不** **伪造** **模块**。）

- [ ] **Step 3:** 删除或改写 **`export const packageName`** **占位**。

- [ ] **Step 4:** **`cd packages/ui && vp check && vp test && vp pack`**。**期望：** 全部通过。

- [ ] **Step 5:** Commit：`feat(ui): public exports and augment doc`

---

### Task 11: `packages/ui/README.md`

**Files:**

- Modify: `packages/ui/README.md`

- [ ] **Step 1:** 撰写 **中文**（或 **中英**）**短 README**：**安装**（**workspace** / **npm** **占位**）、**算法顺序** **default → compact → dark**、**`darkAlgorithm` 输入**、**与 [known-limitations.md](../../docs/known-limitations.md) 一致** **（无 CSS 引擎 / 无 className 主路径）**、**`mergeViewStyles` 为浅合并链** **与 RN 可能差异**（**嵌套 transform** **等** **未** **特殊合并**）。

- [ ] **Step 2:** **`vp check`**。**期望：** 通过（**若** **oxlint** **不** **扫** **md**，**至少** **无** **破坏**）。

- [ ] **Step 3:** Commit：`docs(ui): README for phase-1 theme and style`

---

## Spec 覆盖自检（计划作者）

| Spec 要求                                     | 对应 Task              |
| --------------------------------------------- | ---------------------- |
| G1 Provider + useCanvasToken + getCanvasToken | Task 5–6               |
| G2 default / dark / compact 与顺序            | Task 4–5               |
| G3 mergeViewStyles + resolveSx + SxCanvas     | Task 7–8               |
| G4 Button                                     | Task 9                 |
| G5 无禁止依赖 + vp 通过                       | Task 1、10–11          |
| 嵌套 Provider 深度合并                        | Task 3、6              |
| darkAlgorithm 输入为 default+compact 后 token | Task 5 Step 4          |
| components 命名空间                           | Task 2 types、Task 5   |
| 不实现 bridge / 交互 hooks                    | 本计划 **无** 对应文件 |
| README / 文档义务                             | Task 11                |

**占位符扫描：** 本计划 **无**「TBD / 待实现」**类** **步骤**；**Button children** **与** **Text** **的** **关系** **在** **Task 9** **已** **写明**。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-05-react-canvas-ui-phase-1-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 每个 Task 派生子代理执行，Task 间人工复核，迭代快。

**2. Inline Execution** — 本会话内按 Task 顺序执行，批量提交并在检查点复核。

**Which approach?**
