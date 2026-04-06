# `@react-canvas/ui` · Divider — 设计规格

**日期：** 2026-04-09  
**状态：** 已实现（以 `packages/ui` 与文档站为准）  
**关联：** 与 `Button` 相同 **`token` / `CanvasThemeProvider` 约定**；布局基于 **`View` + `Text`**

---

## 1. 目标与非目标

### 1.1 目标

- 提供画布内可用的 **`Divider`**：与主题 **`CanvasToken`** 对齐（颜色用 **`colorBorder`**，必要时与 **`colorText`** 区分层级）。
- **v1 能力（均需实现）**：
  1. **纯横线**：占满交叉轴宽度（由父级布局 + `alignSelf: 'stretch'` 或显式宽度约束）。
  2. **纯竖线**：占满交叉轴高度（典型为 **`alignSelf: 'stretch'`** 置于 **row** 内）。
  3. **横排带中间文字**：主轴 **row**，结构为 **左线段 | 中间文案 | 右线段**（线段 **`flexGrow: 1`** 均分剩余空间）。
  4. **竖排带中间文字**：主轴 **column**，结构为 **上线段 | 中间文案 | 下线段**（线段 **`flexGrow: 1`** 均分剩余空间），用于竖向分隔条上的标签（侧栏等场景）。
- **对外 API**：与 **`Button`** 一致支持 **`token?: CanvasToken`**；画布内须传 **`token`**（或未来若 reconciler 能透传 Context 再放宽，本规格不假设）。
- **样式**：导出 **`getDividerStyles`** / 或更细的 **`getDividerLineStyle`**（仅「线段」条样式），与 **`getButtonStyles`** 模式一致，便于单测与自定义合并。

### 1.2 非目标（v1 不承诺）

- **Inset 仅缩进线段、整行仍满宽**（如 MUI `variant="inset"`）：可作为 **v2**；v1 若需要缩进，由调用方在外层 **`View`** 上 **`paddingHorizontal`** 实现。
- **DOM / HTML `<hr>`**：本组件仅 **Canvas 子树**。
- **与 Web 某组件逐像素一致**：以 **Yoga + Skia** 布局与字体为准。

---

## 2. 用户可见 API（草案）

### 2.1 类型与 props

```ts
export type DividerOrientation = "horizontal" | "vertical";

export type DividerProps = {
  orientation?: DividerOrientation; // 默认 "horizontal"
  /** 与 Button 相同：Canvas 内须传入 */
  token?: CanvasToken;
  style?: ViewStyle;
  /** 有子节点时渲染「带文案」变体；无子节点时为纯线 */
  children?: ReactNode;
} & InteractionHandlers; // 与 Button 对齐，默认可透传（纯装饰时可不传）
```

- **`orientation`**：
  - **`horizontal`**：纯线时为「高固定、宽由父布局拉伸」；带 **`children`** 时为 **row** 三栏。
  - **`vertical`**：纯线时为「宽固定、高由父布局拉伸」；带 **`children`** 时为 **column** 三栏。
- **`children`**：中间区域内容，**由调用方提供 `Text`**（与 **`Button`** 一致），以便控制字号、颜色、字重。`@react-canvas/ui` 包内 JSX 类型未声明 **`Text`** 宿主，**v1 不**对字符串自动包 **`Text`**；请使用 **`<Text>…</Text>`**。

### 2.2 纯线默认尺寸（逻辑像素）

| `orientation` | 线段厚度（非文字区域） | 主轴长度                                           |
| ------------- | ---------------------- | -------------------------------------------------- |
| `horizontal`  | **高度 = 1**           | **宽 = 100%**（`alignSelf: 'stretch'` 或父给满宽） |
| `vertical`    | **宽度 = 1**           | **高 = 100%**（`alignSelf: 'stretch'` 或父给满高） |

- **颜色**：线段 **`backgroundColor: token.colorBorder`**（**不用** `borderWidth`，避免 hairline 与圆角歧义）。

### 2.3 带文案时的间距与排版

- **主轴**：`horizontal` → **row**，`vertical` → **column**；**`alignItems: 'center'`**（横排时垂直居中竖线+文字；竖排时水平居中横线+文字）。
- **线段与文案间距**：**`gap`** 使用 **`token.paddingSM`**（与主题密度一致；**`compact`** 时 token 已缩小，自动跟随）。
- **中间区**：**`children`** 外包一层 **`View`**（或 **`flexShrink: 0`** 的容器），避免文字被压扁；文案样式由用户 **`Text`** 控制，**默认示例**建议 **`fontSize: token.fontSizeSM`**、**`color: token.colorText`** 或次级灰（与 Playground 对齐时再定一档 **`opacity`** 或固定灰 hex）。

### 2.4 示例（语义）

```tsx
// 纯横线
<Divider token={token} orientation="horizontal" />

// 纯竖线（置于 row 父级内，通常需父级有确定高度）
<Divider token={token} orientation="vertical" style={{ alignSelf: "stretch" }} />

// 横排：左 | 文 | 右
<Divider token={token} orientation="horizontal">
  <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>或</Text>
</Divider>

// 竖排：上 | 文 | 下
<Divider token={token} orientation="vertical" style={{ alignSelf: "stretch", minHeight: 120 }}>
  <Text style={{ fontSize: token.fontSizeSM, color: token.colorText }}>节</Text>
</Divider>
```

---

## 3. 实现结构（建议）

- **`Divider`**：根节点为 **`View`**，根据 **`children` / `orientation`** 分支：
  - **无 `children`**：单个子 **`View`** 线段，样式来自 **`getDividerLineStyle(orientation, token)`**。
  - **有 `children`**：三个子区域 — 两 **`View`**（线）+ 中间 **`View`**（包 **`children`**），两线样式相同，**`flexGrow: 1`** + **`minWidth`/`minHeight`: 0** 避免溢出（与 Yoga 行为对齐时再微调）。
- **`mergeViewStyles`**：根 **`style`** 与用户覆盖合并顺序与 **`Button`** 一致。

---

## 4. 测试与文档

- **单元测试**：对 **`getDividerLineStyle`**（或 **`getDividerStyles`**）断言 **`horizontal` / `vertical`** 下 **`backgroundColor`**、**`height`/`width`** 为 **1**。
- **可选**：快照或轻量渲染测试 **`Divider`** + mock **`CanvasToken`**（若现有 **`Button`** 无此类测试，可仅测样式函数）。
- **文档站**：新增 **`ui/divider.mdx`**（与 **`ui/button.mdx`** 同级），说明 **`token`**、四种用法；**Playground**：在 **`UiPlayground`** 或 **`TwoFactorCardPlayground`** 旁增加一小段示例（实现阶段定稿）。

---

## 5. 自审（规格一致性）

- **范围**：横/竖纯线 + 横/竖带文，与「都要做、中间文字都要」一致。
- **歧义**：**`children` 为 string** 是否自动包 **`Text`** — 建议实现任选其一并在文档与类型注释中写死。
- **竖向长文案**：中间 **`Text`** 若多行，**`flexGrow`** 线段仍均分剩余空间；极端情况由调用方限制字数或字号（v1 不单独做截断）。

---

## 6. 后续（非 v1）

- **`inset` / `variant`**、**`line` 虚线**、**主题 token 增加 `hairlineWidth`** 等，另开规格迭代。
