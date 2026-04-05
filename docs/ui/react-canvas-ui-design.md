# @react-canvas/ui 设计结论（主题、样式、结构与样板）

**日期：** 2026-04-05  
**状态：** 草案  
**依据：** [ui-paradigm-research.md](./ui-paradigm-research.md)、[known-limitations.md](../known-limitations.md)、[development-roadmap.md](../development-roadmap.md)、[阶段三交互规格](../superpowers/specs/2026-04-05-phase-3-interaction-design.md)，以及当前 **`@react-canvas/react`** / **`@react-canvas/core`** 的公开能力。

**范围：** 定义 **`@react-canvas/ui`** 的主题与样式模型、包边界、目录与 API 分层，并给出**样板代码示意**；**不**在本文件中实现具体组件逻辑。

---

## 1. 与 `@react-canvas/react` 的关系

### 1.1 宿主包提供什么

`@react-canvas/react` 当前导出（见 `packages/react/src/index.ts`）包括但不限于：

- **场景与上下文**：`Canvas`、`CanvasProvider`、`CanvasRuntimeContext` / `useCanvasRuntime`
- **布局与绘制原语**：`View`、`Text`、`Image`、`SvgPath`
- **类型与交互**：`ViewProps` / `TextProps` 等上的 **`style`（`ViewStyle`）**、**`CanvasSyntheticPointerEvent`**、**`InteractionHandlers`**（指针事件）

样式数据类型 **`ViewStyle`** 来自 **`@react-canvas/core`**，经 React 包在组件上使用；**Yoga + Skia** 管线只消费 **React Native 风格的布局/外观子集**，而非浏览器 CSS 引擎。

### 1.2 `ui` 包补什么

| 层级                      | 职责                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **`@react-canvas/react`** | Reconciler、宿主节点、命中与指针、**不加**设计系统语义                                                      |
| **`@react-canvas/ui`**    | **Design Token**、主题 Context、**合并与变体**、带默认样式的可复用组件（如 `Button`）、交互态 hooks（规划） |

结论：**主题与组件级默认样式在 `ui`；宿主与几何/事件在 `react`。** 应用通常同时依赖 `react` 与 `ui`，由 `ui` 声明对 `react` 的 peer 依赖（见 §5）。

---

## 2. 目标与边界

### 2.1 目标

| #   | 目标                                                                                        |
| --- | ------------------------------------------------------------------------------------------- |
| G1  | 提供 **可主题化、可组合** 的 Canvas 组件层，默认 **零 DOM 样式引擎**。                      |
| G2  | 与平台一致：**无 CSS 选择器/伪类自动求值**；交互外观由 **事件 + 状态 + `ViewStyle`** 表达。 |
| G3  | **源码随 monorepo 演进**（对齐调研中 shadcn 式「可改」），对外 API 稳定、可文档化。         |
| G4  | **不把** antd/MUI 等 DOM 大库作为 Canvas 组件的 **默认**依赖。                              |

### 2.2 非目标（本包不承诺）

- 复刻 **完整浏览器 CSS**、**运行时 Tailwind**、与 Web 等价的 **className** 主路径（见 [known-limitations.md](../known-limitations.md)）。
- 在纯 Skia 子树内提供与 `<input>` **同源**的原生可编辑控件（输入走 **DOM 覆盖层**，属应用/桥接层）。
- 首版必达 **无障碍 Proxy DOM**（路线图阶段六可协同，不阻塞主题 + 基础组件）。

---

## 3. 主题怎么做

### 3.1 载体与数据形状

| 决议            | 说明                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **主题载体**    | React Context，如 **`CanvasThemeProvider`**                                                                                                 |
| **Token**       | **纯 JS/TS 对象**：全局 token + 可选 **`components` 命名空间** 按组件覆盖（概念对齐 antd **`ConfigProvider` + token**，**不**依赖 antd 包） |
| **消费 API**    | **`useCanvasToken()`**；可选 **`getCanvasToken(config)`** 静态函数（对齐 antd **`useToken` / `getDesignToken`** 心智）                      |
| **暗色 / 紧凑** | **多套 token** 或 **算法函数** 产出「MapToken 式」结果；**非**依赖 DOM CSS 变量切换作为主路径                                               |
| **类型扩展**    | 支持 **`declare module` 扩展主题**（对齐 MUI 扩展 `Theme` 的思路），保证自定义 token 类型安全                                               |

### 3.2 与 DOM 层「同源色板」（可选增强）

若应用存在 **DOM 浮层**（输入、弹窗），建议后续用 **同一套 token 导出为 CSS 变量**，避免两套色板；首版可在文档层约定，代码 **后补**（见 §5.3）。

---

## 4. 样式怎么做

### 4.1 主样式模型

| 决议               | 说明                                                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **主样式模型**     | **`ViewStyle`**（来自 core，经 `View` / `Text` 等使用）                                                                                                                            |
| **对外 API**       | 优先 **`style?: ViewStyle`** + **派生自 token 的默认样式**                                                                                                                         |
| **合并**           | **`mergeViewStyles`**（或等价）做浅/深合并 + 数组展平；与 [development-roadmap.md](../development-roadmap.md) **阶段六 Step 11 — StyleSheet** 对齐后，**优先迁移到 core 官方 API** |
| **禁止作为主 API** | **CSS 字符串**、默认引入 **css-in-js 运行时**（Emotion / `@ant-design/cssinjs`）                                                                                                   |

### 4.2 受限 `sx`（可选）

- **类型示意**：`SxCanvas = ViewStyle | ((token) => ViewStyle) | SxCanvas[]`
- **语义**：借鉴 MUI **`sx` 的主题回调与数组合并**，但 **只产出 `ViewStyle`**，**不**编译为 CSS。
- **文档必须声明**：**无** `'&:hover'` 等伪类自动生效；**hover / pressed** 见 §6 与阶段三规格。

### 4.3 变体与组合件

| 决议       | 说明                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **变体**   | TypeScript 联合类型 + **`Record<Variant, Partial<ViewStyle>>`**；复合变体用 **显式分支或小型决策表**（对齐 CVA **思维**，**不**生成 Tailwind class） |
| **组合件** | 需要时 **`Component.SubComponent`**（如 `Dialog.Root`），与 Radix / Base UI / shadcn **命名心智**对齐                                                |
| **交互态** | **`useHover`** / **`usePressed`** / **`useInteractionState`**（命名以最终实现为准）内部用 **state 驱动 `style`**                                     |
| **禁用态** | **`disabled` prop** + token 推导 `opacity` / `pointerEvents` 等                                                                                      |

---

## 5. 包结构、依赖与目录

### 5.1 依赖三角

```text
@react-canvas/core   ← 场景树、Yoga、ViewStyle、绘制/命中
        ↑
@react-canvas/react  ← Reconciler、Canvas、View、Text、指针事件
        ↑
@react-canvas/ui     ← peer：react + @react-canvas/react；dependencies 默认为空或仅工具库
```

| 项                     | 决议                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **peerDependencies**   | `react`（与仓库 catalog 一致）、**`@react-canvas/react`** `workspace:*`                                                            |
| **dependencies**       | 默认 **不**含 `antd`、`@mui/material`、**运行时** `tailwindcss`                                                                    |
| **@react-canvas/core** | 应用不直接 peer core；`ui` 若需类型，经 **`@react-canvas/react` 重导出** 或 **`import type` from core**（与 react 包导出策略一致） |
| **react-dom**          | **不作为** `ui` 运行时依赖                                                                                                         |

### 5.2 建议目录结构（随实现迭代）

```text
packages/ui/
  src/
    index.ts
    theme/
      types.ts               # CanvasTheme、ComponentTokenMap
      context.tsx            # CanvasThemeProvider
      use-canvas-token.ts
      algorithms.ts          # light / dark / compact 等
    style/
      merge.ts               # mergeViewStyles / flatten（Step 11 对齐时收敛）
      sx.ts                  # 可选 SxCanvas 类型与解析
    primitives/
      box.tsx
      stack.tsx
    components/
      button/
        button.tsx
        variants.ts
    hooks/
      use-interaction.ts
    types/
      augment.ts             # 模块扩展入口
  tests/
  package.json
  vite.config.ts
```

**bridge/**：若引入 DOM 桥，建议 **`@react-canvas/ui/bridge`** 子路径导出，避免主入口拉入 Radix / `react-dom`。

### 5.3 `exports` 规划

| 路径                                  | 内容                                             |
| ------------------------------------- | ------------------------------------------------ |
| **`@react-canvas/ui`**                | Provider、`useCanvasToken`、原语、组件、样式工具 |
| **`@react-canvas/ui/theme`**（可选）  | 仅主题与 token                                   |
| **`@react-canvas/ui/bridge`**（可选） | DOM 桥、token → CSS 变量辅助                     |

首版可只保留 **根入口**。

---

## 6. 明确不采用的默认路径

| 不采用                                             | 原因                                                            |
| -------------------------------------------------- | --------------------------------------------------------------- |
| antd / MUI **成品组件渲染进 Canvas**               | 无 Canvas 后端                                                  |
| **运行时 Tailwind** 作为主叙事                     | 与 token + `ViewStyle` 主线冲突；构建期子集见路线图 **Step 16** |
| **@ant-design/cssinjs / Emotion 作为 ui 主题默认** | 主题用 **纯对象** 即可，避免双样式运行时                        |

---

## 7. 样板代码（示意）

以下仅为 **API 形态示意**，非仓库已实现代码。

### 7.1 应用根部：主题 + 画布

```tsx
import { Canvas, CanvasProvider, View } from "@react-canvas/react";
import { CanvasThemeProvider, useCanvasToken } from "@react-canvas/ui";

function App() {
  return (
    <CanvasThemeProvider theme={lightCanvasTheme}>
      <CanvasProvider width={800} height={600}>
        <Canvas>
          <Screen />
        </Canvas>
      </CanvasProvider>
    </CanvasThemeProvider>
  );
}
```

### 7.2 消费 token 的组件

```tsx
function Screen() {
  const token = useCanvasToken();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: token.colorBgLayout,
        padding: token.padding,
      }}
    />
  );
}
```

### 7.3 带变体的按钮（结构示意）

```tsx
// 内部：variant → Partial<ViewStyle>，再与 props.style 合并
<Button variant="primary" size="md" onPointerDown={...}>
  OK
</Button>
```

### 7.4 交互态（与阶段三一致）

```tsx
// 伪代码：hover 来自指针进入/离开 + state，而非 CSS :hover
const { style, handlers } = useInteractionState({ variant: "ghost" });
return <View style={style} {...handlers} />;
```

---

## 8. 测试、质量与验收

| 项           | 决议                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| **单元测试** | `vp test`（Vitest，经 vite-plus）                                      |
| **测试重点** | Token 合并、**merge**、变体映射、hooks；**少用快照**（style 对象易噪） |
| **Lint**     | `vp check`                                                             |

**验收（规划落地）：**

- [ ] `packages/ui` 能通过 **`vp check`**、**`vp test`**、**`vp pack`**。
- [ ] 公开 API 含 **Provider + `useCanvasToken` + 至少一个示例组件**（如 `Button`），**无**默认 CSS 运行时依赖。
- [ ] 文档说明与 [known-limitations.md](../known-limitations.md) 一致的边界。

---

## 9. 路线图与风险

| 路线图项                        | 与 ui 的关系                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **阶段三**                      | 交互 hooks 依赖指针与命中语义；须遵守 [阶段三规格](../superpowers/specs/2026-04-05-phase-3-interaction-design.md)。 |
| **阶段六 Step 11 — StyleSheet** | ui 内 merge 可视为 **临时**；官方 `StyleSheet` 落地后 **迁移**。                                                    |
| **阶段六 Step 16 — Tailwind**   | **极低优先级**；若做，输出仍为 **`ViewStyle`**。                                                                    |

| 风险                           | 缓解                                              |
| ------------------------------ | ------------------------------------------------- |
| Token 与 core `ViewStyle` 演进 | Changelog + 类型约束；token 仅 **画布可用字段**   |
| merge 与 RN 不完全一致         | 文档写明规则；长期对齐 Step 11                    |
| DOM 桥与 Canvas 两套样式       | token 同源 + CSS 变量导出；桥接晚于主题与基础组件 |

---

## 10. 相关文档

| 文档                                                                                                      | 说明                                 |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| [ui-paradigm-research.md](./ui-paradigm-research.md)                                                      | 多框架范式调研（无 Canvas 专属结论） |
| [known-limitations.md](../known-limitations.md)                                                           | 平台能力边界                         |
| [development-roadmap.md](../development-roadmap.md)                                                       | StyleSheet、Tailwind 等              |
| [2026-04-05-phase-3-interaction-design.md](../superpowers/specs/2026-04-05-phase-3-interaction-design.md) | 指针与 hover 语义                    |

---

**修订记录：** 初稿 2026-04-05；由 `2026-04-05-react-canvas-ui-technical-plan.md` 与调研文档拆分重组而来。
