# `@react-canvas/ui` · Checkbox、Switch、Avatar — 设计规格

**日期：** 2026-04-06  
**状态：** 已定稿（待实现与文档站落地）  
**关联：** 与 `Button` / `Divider` 相同 **`token` / `CanvasThemeProvider` 约定**；布局基于 **`View` / `Text` / `Image` / `SvgPath`**（`Image` 见 [`packages/react/src/hosts/image.ts`](../../../packages/react/src/hosts/image.ts)）

---

## 1. 目标与非目标

### 1.1 目标

- 在画布内提供 **`Checkbox`**、**`Switch`**、**`Avatar`**，视觉与 **`CanvasToken`** 对齐（颜色、圆角、间距、字号等从 token 读取或派生）。
- **Checkbox（v1）**
  - **受控 + 非受控**：`checked` / `defaultChecked` + **`onChange(checked: boolean)`**（函数式，**不**使用 DOM `SyntheticEvent`）。
  - **`disabled`**：降低透明度、忽略按压。
  - **`indeterminate`**：第三态（仅 **受控**；由父级传入 **`indeterminate?: boolean`**）。点击时：若当前为 indeterminate，**首次点击** **`onChange(true)`**，由父级在回调里将 **`indeterminate` 置为 `false`** 并设置 **`checked`**（与常见 Web 行为一致）。
- **Switch（v1）**
  - 与 Checkbox 相同的受控/非受控与 **`disabled`** 约定；**无** indeterminate。
  - 视觉：轨道 + 滑块，`checked` 控制滑块位置。
- **Avatar（v1）**
  - **首字/短文本占位**、**`Image`（`source`）**、**`Icon`（Lucide `LucideIconData`）** 三种内容；**图片加载失败**时走 **fallback**（占位字或 Icon，由 props 约定优先级）。
  - 外形为圆形（或 token 派生的圆角全圆），尺寸可 **`size`** 或与 **`Button`** 档位对齐。
- **内部依赖**：在 **`packages/ui` 内自研** **`useControllableValue`**（或同名 hook），**不**引入 **`ahooks`**；语义与 [ahooks `useControllableValue`](https://github.com/alibaba/hooks/blob/master/packages/hooks/src/useControllableValue/index.en-US.md) 的子集对齐：**`valuePropName` / `defaultValuePropName` / `trigger`** 可配置，用于映射 **`checked` / `defaultChecked` / `onChange`**。
- **文档**：在 Starlight **`/ui/*`** 为三者各增独立页面与使用案例，并更新 **[UI 组件库概览](../../../apps/website/src/content/docs/ui/index.mdx)**；Playground 与现有 **Button / Divider** 模式一致（`apps/website` 内 React 岛 + 画布）。

### 1.2 非目标（v1 不承诺）

- **可访问性树 / ARIA / 焦点环**：Canvas 宿主不模拟完整 a11y；若未来有桥接层，另开规格。
- **与 antd / MUI 逐像素一致**：以 **Yoga + Skia** 与 token 为准。
- **Checkbox 组（全选）**：v1 仅单框；组合逻辑由调用方实现。
- **Switch 加载态 / 异步**：v1 不内置。

---

## 2. `useControllableValue`（内部）

### 2.1 行为

- **`checked === undefined`**：**非受控**，内部 `useState`，初值 **`defaultChecked ?? false`**。
- **`checked !== undefined`**：**受控**，展示值以 **`checked`** 为准。
- 变更时调用 **`onChange`**（若提供）。非受控时同步更新内部 state。
- **`disabled === true`**：不调用 **`onChange`**（与交互吞掉一致）。

### 2.2 放置

- 建议路径：**`packages/ui/src/hooks/use-controllable-value.ts`**（或 `internal/`），**不**从 `index.ts` 公开导出，除非后续有明确需求。

---

## 3. Checkbox

### 3.1 Props（草案）

```ts
export type CheckboxProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  token?: CanvasToken;
  style?: ViewStyle;
  /** 可选：右侧说明文案由调用方用相邻 `Text` 提供；v1 不包「框+label」组合件 */
  children?: ReactNode;
} & InteractionHandlers; // onPress 等可与内部点击合并，见实现
```

- **`onChange`**：在 **`InteractionHandlers`** 之外，增加 **`onChange?: (checked: boolean) => void`**（或与 `InteractionHandlers` 合并策略在实现中二选一：**推荐**显式 **`onChange(checked: boolean)`**，避免与 **`onPress`** 语义重复；若保留 **`onPress`**，则文档约定 **`onChange` 为状态变更主通道**）。

### 3.2 视觉

- 外框：边长与 **`token`** 或 **`size`** 枚举（建议 **`sm` / `md`**，与 Button 对齐）挂钩；边框色 **`colorBorder`**，选中 **`colorPrimary`**（或 token 中已有主色字段，与 Button primary 一致）。
- **选中**：勾（可用 **`SvgPath`** 或两条 `View` 线段简化，实现计划定）。
- **indeterminate**：减号（横条）或等价图形，与 `checked` 同时为 true 时以规格为准：**通常** indeterminate 优先于「已勾选」视觉（父级应避免同时传 `checked=true` 与 `indeterminate=true`；若发生，**spec 约定**以 **indeterminate 视觉** 为准）。

### 3.3 测试

- 受控/非受控切换、**`disabled`**、**`indeterminate`** 点击一次后的 **`onChange`** 参数；variants 纯函数（若有）。

---

## 4. Switch

### 4.1 Props（草案）

```ts
export type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  token?: CanvasToken;
  style?: ViewStyle;
  size?: "sm" | "md"; // 与轨道宽高相关
} & InteractionHandlers;
```

- **`onChange?: (checked: boolean) => void`**：与 Checkbox 一致。

### 4.2 视觉

- 轨道圆角胶囊；滑块圆形；**`checked`** 时滑块移至右侧，轨道用主色填充。

---

## 5. Avatar

### 5.1 Props（草案）

```ts
export type AvatarProps = {
  token?: CanvasToken;
  style?: ViewStyle;
  size?: number | "sm" | "md" | "lg"; // 与 token 字号/间距映射
  /** 若提供且加载成功，则显示图片 */
  source?: ImageSource;
  /** Lucide 图标数据；与 source 同时存在时，规格约定优先级 */
  icon?: LucideIconData;
  /** 无图或图失败时的文字（如首字母） */
  children?: ReactNode;
} & InteractionHandlers;
```

### 5.2 内容优先级（v1）

1. **`source`** 存在且 **`Image` `onLoad` 成功** → 显示图片（圆形裁剪由外层 `View` **`overflow: 'hidden'`** + **`borderRadius`** 实现，若宿主支持）。
2. 否则若 **`icon`** → **`Icon`**。
3. 否则 **`children`**（通常为 **`Text`** 单字符）。
4. 若皆无：**可选**空占位（灰色底）或文档要求必须提供 **`children` / `icon` / `source` 之一**（实现计划二选一，**推荐**至少提供 **`children` 或 `icon`** 以避免空）。

### 5.3 图片失败

- 使用 **`Image` `onError`**：切换到 **fallback**（与上表同序，跳过「成功图」）。

---

## 6. 主题与 `token`

- 与 **`Button`** 相同：若 **`CanvasThemeContext`** 在画布内不可用，**须传入 `token`**（与现有错误提示风格一致）。
- 新增组件若需 token 字段缺失，**仅**使用已有 **`CanvasToken`** 键（如 **`colorBorder`、`colorPrimary、fontSize、borderRadius`**），不随意扩展 token（若必须扩展，在 **`theme/types`** 中显式增加并记入规格）。

---

## 7. 导出与文档

- **`packages/ui/src/index.ts`**：导出 **`Checkbox`、`Switch`、`Avatar`** 及必要类型；**`getCheckboxStyles` / `getSwitchStyles` / `getAvatarStyles`** 若与 Button 模式一致则导出，便于测试与自定义合并。
- **文档**：`apps/website/src/content/docs/ui/checkbox.mdx`、`switch.mdx`、`avatar.mdx`；**`index.mdx`** 增加链接；按需 **`astro.config`** 侧栏（若项目需显式注册）。
- **Playground**：与 **Button** 类似，增加或扩展 **`UiPlayground`** / 独立路由（实现计划细化）。

---

## 8. 测试清单（v1）

- **`useControllableValue`**：受控、非受控、**`disabled` 不触发 onChange**。
- **Checkbox**：样式快照或 **get\*Styles**、**indeterminate** 点击一次行为。
- **Switch**：**`checked`** 切换样式。
- **Avatar**：优先级与 **onError** fallback（可用 mock 或单测可测的纯逻辑）。

---

## 9. 规格自检（2026-04-06）

- 无 TBD；**indeterminate 与 `checked` 同时 true** 已约定为 **indeterminate 视觉优先**。
- **Checkbox** 的 **`onChange` 与 `InteractionHandlers`** 在实现中二选一或合并策略需在实现计划里写清，避免重复触发。
