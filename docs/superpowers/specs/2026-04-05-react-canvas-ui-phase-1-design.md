# @react-canvas/ui 第一阶段 — 主题、算法与样式基础设施

**日期：** 2026-04-05  
**状态：** 已与负责人确认（选项 **C**：亮色 + **algorithm** 产出暗色/紧凑；含 **Provider + `useCanvasToken` + 样式工具 + 最小 `Button`**）。  
**依据：** [react-canvas-ui-design.md](../../ui/react-canvas-ui-design.md)、[known-limitations.md](../../known-limitations.md)、[development-roadmap.md](../../development-roadmap.md)。

**范围：** 在 `packages/ui` 落地 **纯对象主题**、**可组合算法**（default / dark / compact）、**`mergeViewStyles` 与受限 `SxCanvas`**、**最小示例组件 `Button`** 与单测；**不**包含 DOM bridge、交互态 hooks（阶段三）、无障碍代理层。

---

## 1. 目标与非目标

### 1.1 目标

| #   | 目标                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | 提供 **`CanvasThemeProvider`** + **`useCanvasToken()`**，以及可选 **`getCanvasToken(config)`**（或等价静态函数），用于在 **Canvas 子树**中读取主题 token。               |
| G2  | 首版提供 **亮色基线**、**暗色**、**紧凑** 三种维度的 **纯函数算法**；算法 **组合顺序固定**（见 §3.3），对外仅一种叙事。                                                  |
| G3  | 提供 **`mergeViewStyles`**（含数组展平）与 **`resolveSx`**（或等价名），**`SxCanvas`** 只产出 **`ViewStyle`**，**不**编译为 CSS、**不**支持 `'&:hover'` 等伪类自动生效。 |
| G4  | 提供最小 **`Button`**（`variant` / `size` / `disabled` / `style`），内部 **token → `Partial<ViewStyle>`** 与 **merge** 合并。                                            |
| G5  | **`vp check`**、**`vp test`**、**`vp pack`** 通过；**无** antd / MUI / **运行时** Tailwind / **@ant-design/cssinjs** 等默认依赖。                                        |

### 1.2 非目标（本阶段不承诺）

- **`@react-canvas/ui/bridge`**、token → CSS 变量（可留后续，见 [react-canvas-ui-design.md](../../ui/react-canvas-ui-design.md) §3.2）。
- **`useHover` / `usePressed`** 等（见 [phase-3-interaction-design.md](./2026-04-05-phase-3-interaction-design.md)）。
- 与 **core 阶段六 Step 11 — StyleSheet** 完全对齐；若后续 `StyleSheet` 落地，**merge 实现迁移**到官方 API（本设计不阻塞先实现 `mergeViewStyles`）。

---

## 2. 包边界与依赖

- **`peerDependencies`**：`react`（与仓库 catalog 一致）、**`@react-canvas/react`** `workspace:*`。
- **`dependencies`**：默认 **不**引入 antd、MUI、Emotion、**运行时** `tailwindcss`、**@ant-design/cssinjs**。
- **`ViewStyle`**：实现阶段使用 **`import type { ViewStyle } from "@react-canvas/core"`**；若后续 `@react-canvas/react` 重导出 `ViewStyle`，可改为从 react 包统一导入（与本仓库 [react-canvas-ui-design.md](../../ui/react-canvas-ui-design.md) §5.1 一致）。
- **`react-dom`**：**不作为** `ui` 运行时依赖。

---

## 3. 主题模型与算法

### 3.1 Token 形状

- **单一消费类型** `CanvasToken`（或项目内最终命名），字段 **仅包含** 画布上可安全映射到 **`ViewStyle`** 的语义（颜色、间距、圆角、字号等）；**不**引入浏览器专属 CSS 属性名。
- **可选 `components` 命名空间**：按组件名（如 `Button`）存放 **Partial<CanvasToken>** 或组件专用 token 子对象，**嵌套 Provider 时深度合并**（子覆盖父）。
- **类型扩展**：支持 **`declare module` 扩展**（与 MUI 思路一致），便于应用侧增加自定义 token 字段。

### 3.2 `seed` 与算法职责

- **`seedToken`**（或 `SeedToken`）：**最小输入**（如 `colorPrimary`、`borderRadius` 等），由 **`defaultAlgorithm`** 展开为 **完整亮色** `CanvasToken`。
- **`darkAlgorithm`**：输入为 **已解析的亮色 `CanvasToken`**（见 §3.4 决议 **b**），输出 **`Partial<CanvasToken>`** 作为 **暗色覆盖层**；便于基于「当前主色、背景、边框」等已解析值做映射，而非仅从 seed 推导。
- **`compactAlgorithm`**：输入为 **当前已解析的 `CanvasToken`**（亮色或已叠暗色后的 token），输出 **`Partial<CanvasToken>`**，主要调整 **间距、字号、密度** 等。

### 3.3 算法组合顺序（已确认）

**固定顺序**：**default（亮色全量）→ compact（若启用）→ dark（若启用暗色）**。

- **语义**：先得到亮色全量；若启用紧凑则叠紧凑覆盖；若启用暗色则 **最后** 叠暗色覆盖（暗色盖在最上）。
- **对外配置**：用 **单一 `theme` 对象**表达（如 `seed` + `appearance: 'light' | 'dark'` + `density: 'default' | 'compact'` **或**等价 `algorithm` 数组），**不在首版**引入两套并行且语义冲突的 API；具体字段名在实现时二选一并在实现计划中写死。

### 3.4 Provider 与合并

- **`CanvasThemeProvider`**：向子树提供 **已解析的 `CanvasToken`**（及可选 `getCanvasToken` 用的 **config 快照**）。
- **嵌套 Provider**：子主题 **深度合并** 父 token；**`components`** 按 key 合并。
- **`useCanvasToken()`**：返回当前 **合并后** token。
- **静态 `getCanvasToken(config)`**（可选但推荐）：给定 **与 Provider 相同的 config 形状**，**不依赖 React** 得到同一套解析结果，便于测试与非组件代码。

---

## 4. 样式层

### 4.1 `mergeViewStyles`

- **签名**（示意）：`mergeViewStyles(...styles: Array<ViewStyle | undefined | ViewStyle[]>)`：数组参数 **展平**，**后者覆盖前者**；与 RN 常见行为对齐之处在 **README 或注释中写明**；与 RN 不一致处 **显式列出**（避免静默假设）。

### 4.2 `SxCanvas` 与 `resolveSx`

- **类型**（示意）：`SxCanvas = ViewStyle | ((token: CanvasToken) => ViewStyle) | SxCanvas[]`。
- **`resolveSx(token, sx)`**：递归解析函数与数组，**最终** `mergeViewStyles` 成单一 `ViewStyle`。
- **文档义务**：**无** CSS 伪类自动求值；**hover / pressed** 由阶段三交互与 **state + style** 表达（见 [react-canvas-ui-design.md](../../ui/react-canvas-ui-design.md) §4、§7.4）。

---

## 5. 最小组件：`Button`

- **Props**（最小集）：`variant`（如 `primary` | `ghost`）、`size`（如 `sm` | `md`）、`disabled`、`style?`、`children` 等；**指针事件**若 `@react-canvas/react` 已提供则透传；否则首版 **仅**静态样式与 `disabled` 样式，不强制依赖阶段三。
- **实现**：`variant` / `size` → **`Record<..., Partial<ViewStyle>>`**；与 `mergeViewStyles(tokenStyle, variantStyle, props.style)` 合并。
- **展示**：可放在 `packages/ui` 内导出；**网站 demo** 若需可后续接，**非**本阶段门禁。

---

## 6. 目录与导出（首版）

与 [react-canvas-ui-design.md](../../ui/react-canvas-ui-design.md) §5.2 对齐，首版至少包含：

```text
packages/ui/src/
  index.ts
  theme/
    types.ts
    context.tsx
    seed.ts                 # 默认 seed（若需要）
    algorithms.ts           # defaultAlgorithm, darkAlgorithm, compactAlgorithm
    use-canvas-token.ts
    get-canvas-token.ts     # 可选
  style/
    merge.ts
    sx.ts
  components/
    button/
      button.tsx
      variants.ts
  tests/
```

**`exports`**：首版 **仅根入口** `@react-canvas/ui`（与 [react-canvas-ui-design.md](../../ui/react-canvas-ui-design.md) §5.3 一致）。

---

## 7. 测试与验收

| 项           | 要求                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **单元测试** | `vp test`；覆盖 **token 解析**、**嵌套 Provider 合并**、**算法顺序**、**mergeViewStyles**、**resolveSx**、**Button variant 合并**。 |
| **快照**     | **少用**；style 对象易噪，以 **断言关键字段** 为主。                                                                                |
| **质量**     | `vp check` 通过。                                                                                                                   |
| **打包**     | `vp pack` 通过。                                                                                                                    |

**验收清单（本阶段）：**

- [ ] `packages/ui` 通过 **`vp check`**、**`vp test`**、**`vp pack`**。
- [ ] 公开 API 含 **`CanvasThemeProvider`**、**`useCanvasToken`**（及可选 **`getCanvasToken`**）、**`mergeViewStyles`**、**`resolveSx` / `SxCanvas`**、**默认 seed + 算法**、**`Button`**。
- [ ] 文档（`packages/ui/README.md` 或 `docs/ui` 交叉引用）说明 **算法组合顺序**、**暗色算法输入为已解析亮色 token**、**与 [known-limitations.md](../../known-limitations.md) 一致的边界**。

---

## 8. 相关文档

| 文档                                                                                   | 说明                          |
| -------------------------------------------------------------------------------------- | ----------------------------- |
| [react-canvas-ui-design.md](../../ui/react-canvas-ui-design.md)                        | **@react-canvas/ui** 总体设计 |
| [known-limitations.md](../../known-limitations.md)                                     | 平台能力边界                  |
| [development-roadmap.md](../../development-roadmap.md)                                 | StyleSheet、Tailwind 等       |
| [2026-04-05-phase-3-interaction-design.md](./2026-04-05-phase-3-interaction-design.md) | 指针与交互（后续阶段）        |

---

## 9. 修订记录

| 日期       | 说明                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------- |
| 2026-04-05 | 初稿：选项 C；算法顺序 **default → compact → dark**；**`darkAlgorithm` 输入为已解析亮色 token**。 |
