# overflow 与圆角裁剪

本文说明 **`ViewStyle.overflow`** 在 **`@react-canvas/core`** 中的语义，以及它与 **`borderRadius`**、**命中测试** 的关系。布局仍由 **Yoga** 计算；**裁剪**由 **Skia** 绘制管线实现，与 React Native 中「`overflow: 'hidden'` + 圆角」的常见用法对齐。

---

## 1. 摘要

| 属性           | 说明                                                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `overflow`     | 未设置或 **`visible`**：子节点绘制**不**按父盒裁剪（默认）。**`hidden`**：子节点在**本节点布局盒**内按 **`borderRadius`** 做圆角矩形裁剪（`clipRRect` / `clipRect`）。 |
| `borderRadius` | 与背景的圆角矩形一致；裁剪时半径为 `min(borderRadius, width/2, height/2)`。                                                                                            |
| **`<Image>`**  | 若 **`borderRadius > 0`**，即使未设 `overflow`，也会在**本 Image 节点**上对位图与子节点做裁剪（便于圆形头像等）。                                                      |

**Yoga** 只负责盒子的宽高与位置，**不负责**裁剪；此前仅有圆角背景/描边、子内容仍可能以矩形铺满，现已通过 **`overflow: 'hidden'`** 与 **Image 圆角** 分支补上。

---

## 2. 绘制（`packages/core/src/render/paint.ts`）

- 对 **`overflow === 'hidden'`** 的 **`View`**：在画完背景与边框后、递归子节点前 **`save()` → `clipRRect`/`clipRect` → 子树 → `restore()`**。
- 对 **`SvgPath`**：路径本体绘制完成后，若 **`overflow === 'hidden'`**，对**子节点**同样套一层裁剪。
- 对 **`Image`**：若 **`overflow === 'hidden'`** 或 **`borderRadius > 0`**，在绘制位图与子节点前建立裁剪区。

实现细节见 **`clipToLayoutRoundedRect`**。

---

## 3. 命中测试（`packages/core/src/input/hit-test.ts`）

与可见区域一致，避免「透明圆角外缘」仍被点到：

- **`overflow === 'hidden'`**：用 **`pointInRoundedRectLocal`**（见 **`geometry/rounded-rect-hit.ts`**）判断局部坐标是否在圆角矩形内；**不在则整棵子树不命中**。
- **`Image`** 且 **`borderRadius > 0`**：同样按圆角区域过滤（与绘制裁剪一致）。

---

## 4. 组件侧建议

- **`@react-canvas/ui` 的 `Avatar`**：外层容器样式 **`getAvatarContainerStyle`** 已包含 **`overflow: 'hidden'`** 与圆形 **`borderRadius`**，网络图片会按圆裁剪。
- 自定义卡片若需「圆角卡片 + 内部图片不溢出」，请为容器设置 **`overflow: 'hidden'`** 与相应 **`borderRadius`**。

---

## 5. 与 React Native 的对应关系

RN 中常见写法是父级 **`overflow: 'hidden'`** 配合 **`borderRadius`**，子视图（含 **`Image`**）被裁在圆角矩形内。本仓库在画布自绘层复现该行为；**不**依赖 Yoga 提供裁剪能力。
