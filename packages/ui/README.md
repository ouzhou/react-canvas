# @react-canvas/ui

基于 `@react-canvas/react` 宿主原语的 **Canvas 设计系统层**：**Design Token**、**主题 Context**、**ViewStyle 合并**、受限 **`sx`**，以及最小 **`Button`**。主题数据为 **纯 JS 对象**，**不**使用运行时 CSS-in-JS、**不**引入 antd/MUI 成品组件。

## 安装

在 monorepo 内：

```bash
pnpm add @react-canvas/ui
```

（对外发布时以包名与版本为准；本地开发使用 `workspace:*`。）

## 主题与算法顺序

解析顺序固定为：

1. **`defaultAlgorithm(seed)`** — 由 **seed** 得到亮色完整 **`CanvasToken`**
2. **`compactAlgorithm`**（当 **`density: 'compact'`**）— 在上一结果上叠 **紧凑** 覆盖
3. **`darkAlgorithm`**（当 **`appearance: 'dark'`**）— 在 **当前 token**（已含 compact）上叠 **暗色** 覆盖

**`darkAlgorithm(token)`** 的 **`token`** 为 **已应用 default + compact 后的** 语义基线（再生成 `Partial<CanvasToken>` 暗色层）。

## 使用示例

```tsx
import { Canvas, CanvasProvider } from "@react-canvas/react";
import { CanvasThemeProvider, useCanvasToken, Button } from "@react-canvas/ui";

<CanvasThemeProvider theme={{ appearance: "light", density: "default" }}>
  <CanvasProvider width={800} height={600}>
    <Canvas>
      <Button variant="primary" size="md" />
    </Canvas>
  </CanvasProvider>
</CanvasThemeProvider>;
```

**说明：** 在宿主上展示 **文字** 需阶段二的 **`<Text>`**；`Button` 的 `children` 可先留空或仅布局。

## `mergeViewStyles`

对 **`ViewStyle`** 做 **浅合并链**（后者覆盖前者），并展平嵌套数组参数。与 React Native 的 **完全** 行为可能不一致：例如 **未** 对 **`transform`** 等嵌套数组做特殊归并，详见实现与单测。

## 能力边界

与仓库 [known-limitations.md](../../docs/known-limitations.md) 一致：无完整浏览器 **CSS 引擎**、无与 Web 等价的 **`className`** 主路径；交互态（hover 等）由 **指针事件 + state + `ViewStyle`** 表达（阶段三），本包 **不** 提供 CSS 伪类自动求值。

## 开发

```bash
vp install
vp check
vp test
vp pack
```
