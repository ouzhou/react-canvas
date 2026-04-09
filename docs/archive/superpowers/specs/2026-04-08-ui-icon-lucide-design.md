# `@react-canvas/ui` · Icon（Lucide）— 设计规格

**日期：** 2026-04-08  
**状态：** 已对齐实现（`@lucide/icons` 数据 API）  
**关联：** [阶段四 Image 与 SvgPath](./2026-04-05-phase-4-image-svgpath-design.md)（宿主仍为 **`SvgPath`**；本规格仅定义 **UI 层薄封装**）

---

## 1. 目标与非目标

### 1.1 目标

- 在 **Canvas / `@react-canvas/react`** 场景下，以 **与 Lucide 一致的习惯** 使用图标：**按需 `import` 单个图标模块**，便于 **tree-shaking**，避免全量图标包。
- **对外 API**：`<Icon icon={…} … />`，其中 **`icon` 为 `@lucide/icons` 单文件默认导出**（**`{ name, node, size? }`**，与 Lucide 官方 **IconNode** 数据一致）。
- **对内实现**：将 **`node`** 中的 **path / circle**（v1）转为 **`d` 字符串**，合并为 **单条** `<SvgPath>` 的 **`d`**（多段 path 等价于多条子路径）；**`viewBox`** 默认 **`"0 0 24 24"`**。
- **依赖策略**：**`@lucide/icons` 为 peerDependency**（由使用方锁定版本，与仓库 **catalog** 对齐，例如 **^1.7.0**）；**不**依赖 **`lucide-react`** 即可在 Canvas 上绘制图标（文档站若需 DOM 图标可另装 `lucide-react`）。

### 1.2 非目标

- **新宿主类型**：不增加 `Icon` 作为 reconciler 宿主；**不**在 core 层解析 Lucide。
- **完整 SVG / `<svg>` 子树**：与阶段四一致，**不**实现通用 SVG DOM；v1 仅将 **path** 与 **circle** 降为 **`d`**（见 §4.3）。
- **与 `lucide-react` 的 DOM 输出逐像素一致**：以 **同一套 path 数据 + SvgPath 绘制管线** 为准；抗锯齿等与 DOM 的差异不列为阻塞项。
- **Lucide 以外的图标库**：本规格不承诺；若未来扩展，另开规格。

---

## 2. 用户可见 API（草案）

### 2.1 形状

```tsx
import camera from "@lucide/icons/icons/camera";
import { Icon } from "@react-canvas/ui";

<Icon icon={camera} size={48} color="red" strokeWidth={1} />;
```

- **`icon`**（必填）：类型 **`LucideIconData`**（与 `@lucide/icons/icons/*` **default export** 一致）：**`{ name: string; node: IconNode; size?: number }`**。
- **尺寸**：优先 **`size?: number`**（正方形边长），语义与 **`SvgPath` 的 `size` 糖**一致；若同时提供 **`style.width` / `style.height`**，**以后者合并顺序中 `size` 覆盖宽高为准**（见实现：`mergeViewStyles(style, { width: size, height: size })`）。
- **颜色**：**`color?: string`** 默认映射到 **`stroke`**（与常见 Lucide **outline** 图标一致）。
- **线宽**：**`strokeWidth?: number`**（默认 **1**），映射到 `SvgPath`。
- **其余**：**`style?: ViewStyle`**、**`InteractionHandlers`**、**`onError`** 等与 `SvgPath` / `View` 能力对齐。

### 2.2 不推荐 / 明确不支持

- **仅传 `lucide-react` 的 `LucideIcon` 组件引用**：运行时 **无法**从该引用同步读取 **`iconNode`**（见实现计划前置结论）；须使用 **`@lucide/icons`** 数据。
- **`component={<… />}`**、**字符串 `name="camera"`**（v1）：不采纳。

---

## 3. 与底层 `SvgPath` 的映射

以 `@react-canvas/react` 的 **`SvgPathProps`** 为准（[`packages/react/src/hosts/svg-path.ts`](../../../packages/react/src/hosts/svg-path.ts)）。

| Icon（对外）      | 映射说明                                                                       |
| ----------------- | ------------------------------------------------------------------------------ |
| `size`            | → 外层 **`View`** 与 **`SvgPath`** 的布局边长（与 `SvgPath` 的 `size` 糖一致） |
| `color`           | → 默认 **`stroke`**（**`fill`** 由用户显式传或留空）                           |
| `stroke` / `fill` | 显式传入时 **优先于** `color` 对 stroke 的默认                                 |
| `strokeWidth`     | → `strokeWidth`                                                                |
| `style`           | 合并进 **`View`** 的 `ViewStyle`                                               |
| 交互 / `onError`  | 置于外层 **`View`** / 传给 **`SvgPath`**（实现以代码为准）                     |

**命中区域**：**v1 为外层 `View` 的 AABB**（单 `SvgPath` 合并 `d`）。

---

## 4. Lucide 数据结构 → `d` / `viewBox`

### 4.1 实现策略

- 自 **`icon.node`（IconNode）** 遍历：
  - **`path`**：取 **`d`**。
  - **`circle`**：用几何公式转为圆的 **`d`**（两圆弧闭合）。
- 多段合并为 **一条** `d`（空格拼接），由 **单个** `<SvgPath>` 绘制（与「多条 `<SvgPath>`」视觉等价，且避免 Yoga 兄弟节点堆叠问题）。

### 4.2 多 path 图标

**选用策略 A 的等价实现**：多段 path / circle → **单 `SvgPath`**、**合并 `d`**；测试覆盖 **path-only** 与 **path + circle**（如 **camera**）。

### 4.3 非 path 图元

- **v1 支持**：**path**、**circle**。
- **line / polyline / polygon / rect** 等：可 **静默跳过** 或后续规格扩展；若某图标在 v1 下 **无有效 `d`**，可 **`onError`** 或渲染空（实现择一并在 README 说明）。

---

## 5. 依赖与版本

| 包                    | 关系                                                    |
| --------------------- | ------------------------------------------------------- |
| `@lucide/icons`       | **peerDependencies**（如 **^1.7.0**）；测试与类型同版本 |
| `@react-canvas/react` | **peer**                                                |
| `react`               | **peer**                                                |

**升级策略**：用户升级 **`@lucide/icons`** 时，以 **单元测试**（camera + 单 path 样例）捕获；`@react-canvas/ui` 发版说明中注明 **已测 `@lucide/icons` 范围**。

---

## 6. 测试与文档

- **单元测试**：**`iconNodeToPathPayloads`**（单 path、**camera** path+circle）；可选 **`Icon`** 快照/结构测试。
- **README / 文档站**：示例为 **`import camera from "@lucide/icons/icons/camera"`**；说明须 **自行安装** **`@lucide/icons`**（peer）。

---

## 7. 自检

- [x] 与阶段四 **不新增宿主**、数据流 **`d` + viewBox** 一致。
- [x] 范围：**Icon 薄封装 + peer `@lucide/icons`**。

---

## 8. 后续

- 实现计划：[2026-04-08-ui-icon-lucide-implementation.md](../plans/2026-04-08-ui-icon-lucide-implementation.md)。
