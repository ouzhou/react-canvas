# 阶段四（M4）Image 与 SvgPath — 设计规格

**日期：** 2026-04-05  
**状态：** 已确认草案；与 [development-roadmap.md](../../development-roadmap.md) 阶段四 Step 8 及对话结论一致。  
**范围：** **位图 `Image`**（`uri` 解码、`resizeMode`、缓存、`onLoad`/`onError`）；**矢量 `SvgPath`**（仅 **SVG path `d` + `viewBox` 映射到布局盒**，用 CanvasKit 构造 `Path` 后 `drawPath`）。**不含** 完整 `<svg>` XML 解析、非 path 图元（circle/rect 等）、ScrollView（Step 9）、阶段五渐变与 `clipPath` 等。

---

## 1. 文档落点

| 方案                                          | 说明                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **A. 本文件为阶段四多媒体子集主规格（采用）** | 与 roadmap Step 8 对齐并补充 **`SvgPath`**；`hostconfig-guide`、`runtime-structure-constraints` 交叉引用。 |
| B. 仅写 roadmap                               | Step 8 未展开 SvgPath 细节，不足以冻结 API 与 Skia 用法。                                                  |

---

## 2. 目标与非目标

### 2.1 目标

- **`Image`**：支持 `source: { uri: string }`，异步 **fetch → `CanvasKit` 解码为 `SkImage`**，在 Yoga 布局矩形内按 **`resizeMode`** 绘制；**URL → `SkImage`** 缓存避免重复解码；**`onLoad` / `onError`**。
- **`SvgPath`**：宿主类型 **`"SvgPath"`**；必填 **`d`**（SVG path 语法字符串）；**`viewBox`** 默认 **`"0 0 24 24"`**（与常见图标一致）；将 **viewBox 空间** 映射到 **节点布局矩形**，使用 CanvasKit 提供的 **从 SVG path 字符串构造 `Path`** 的 API（如 `MakeFromSVGString` 等，以 `canvaskit-wasm` 类型为准），再 **`drawPath`**；支持 **stroke/fill** 等与线框/填色图标相关的 **Paint** 参数。
- **交互**：与 **`View` / `Text`** 一致，扩展 **`InteractionHandlers`**；命中 **v1 为布局轴对齐包围盒**。

### 2.2 非目标（本规格不承诺）

- **完整 SVG 文档**：整段 `<svg>...</svg>`、XML 解析、`<g>` 子树、`<defs>`、CSS、SMIL 动画。
- **非 path 图元**：`<circle>`、`<rect>` 等（若需要，后续单独规格或先在外部转为 `d`）。
- **`Icon` / Lucide 注册表**：可作为 **`SvgPath` 之上的薄封装** 或独立包，**不**作为本规格必达宿主类型；数据流仍为 **`d` + viewBox**。
- **路径级命中**：`Path.contains()` 等留作后续优化；v1 与 roadmap 一致采用 **AABB**。
- **图片格式以外的 source**：如 `require()` / `ArrayBuffer` 可作为后续扩展，本规格 **`source` 仅 `{ uri: string }`**。

---

## 3. 已确认决策摘要

| #   | 主题             | 决议                                                                                                                                                                                        |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **矢量范围**     | **仅 A**：`d` + **viewBox → 布局盒**；不接完整 SVG XML。                                                                                                                                    |
| 2   | **宿主划分**     | **`Image`** 与 **`SvgPath`** 两个宿主，**不**合并为单一 `Graphic`。                                                                                                                         |
| 3   | **矢量宿主名**   | **`SvgPath`**（不用 `SVG` 以免暗示完整文档模型）。                                                                                                                                          |
| 4   | **viewBox 映射** | 默认 **等比缩放并居中** 落入 Yoga 给出的内容矩形（与常见图标一致）。                                                                                                                        |
| 5   | **布局**         | 支持 **`size` 糖**（正方形边长）与 **`style.width` / `style.height`**；**优先顺序**：若提供 **`size`**，则布局为 **`size × size`**（与 `style` 冲突时以本规格实现为准并在实现计划中写死）。 |

---

## 4. Skia / CanvasKit 约束

- **CanvasKit（WASM）** 通常 **不包含** 完整 **SkSVG DOM**；**矢量路径**应使用 **`d` 字符串 → `SkPath`** 的 API，再 **`canvas.drawPath`**。
- **`MakeFromSVGString`（或等价）** 解析的是 **SVG path 的 `d` 语法**，不是整段 XML；传入非法字符串可能得到 **空 path** 或 **null**（以实际 API 为准）。
- **位图**使用 **`MakeImageFromEncoded`**（或等价）与 **`drawImageRect`**（或带采样模式的绘制），与 roadmap Step 8 一致。

---

## 5. 对外 Props

### 5.1 `Image`

| 属性         | 类型                                                                             | 说明                                    |
| ------------ | -------------------------------------------------------------------------------- | --------------------------------------- |
| `source`     | `{ uri: string }`                                                                | 必填                                    |
| `style`      | `ViewStyle?`                                                                     | 宽高等参与 Yoga                         |
| `resizeMode` | `'cover' \| 'contain' \| 'stretch' \| 'center'`（首批可实现子集与 roadmap 对齐） | 在布局矩形内如何放置像素                |
| `onLoad`     | `() => void`                                                                     | 解码成功且已具备可绘制 `SkImage` 后调用 |
| `onError`    | `(error: unknown) => void`                                                       | 网络或解码失败                          |
| —            | `InteractionHandlers`                                                            | 与现有一致                              |

**叶子**：无 **`children`**（与 runtime 约束文档一致时可校验）。

### 5.2 `SvgPath`

| 属性             | 类型                             | 说明                                                       |
| ---------------- | -------------------------------- | ---------------------------------------------------------- |
| `d`              | `string`                         | 必填；SVG path `d`                                         |
| `viewBox`        | `string?`                        | 默认 **`"0 0 24 24"`**                                     |
| `size`           | `number?`                        | 可选；若设置，布局 **`size × size`**（见 §3 表 #5）        |
| `style`          | `ViewStyle?`                     | margin、opacity、圆角等；宽高与 `size` 关系见 §3           |
| `color`          | `string?`                        | 便捷：映射策略在实现计划中写死（如默认作用于 `stroke`）    |
| `stroke`         | `string?`                        |                                                            |
| `fill`           | `string?`                        | 线框图标常用 **`none`** 或透明                             |
| `strokeWidth`    | `number?`                        |                                                            |
| `strokeLinecap`  | `'butt' \| 'round' \| 'square'?` | 可选，按实现计划分批                                       |
| `strokeLinejoin` | `'miter' \| 'round' \| 'bevel'?` | 可选，按实现计划分批                                       |
| `onError`        | `(error: unknown) => void`       | **可选**；`d` 无法解析时触发或仅 `console.warn` 二选一成文 |
| —                | `InteractionHandlers`            |                                                            |

**叶子**：无 **`children`**。

---

## 6. 场景树与数据流

- **Reconciler**：为 **`"Image"`** 与 **`"SvgPath"`** 注册宿主类型；**`createInstance` / `commitUpdate` / `prepareUpdate`** 将上述 props 写入场景节点专有字段。
- **`Image`**：**异步**路径在解码完成后标记 **dirty** 并 **`queueLayoutPaintFrame`**（与现有一帧一绘一致）。
- **`SvgPath`**：**同步**更新；**`d` 或 `viewBox` 或影响布局的 style/size 变化**时使缓存的 **`SkPath` 失效** 并重算 **viewBox → 布局矩形** 的变换矩阵。

---

## 7. 绘制要点

### 7.1 `Image` 与 `resizeMode`

- 在 **Yoga 给出的矩形**（含圆角 clip 若与 `View` 共享策略）内，按 **`cover` / `contain` / `stretch` / `center`** 计算 **源矩形与目标矩形**；语义与 React Native / 常见约定对齐，边界情况在实现计划中列举。

### 7.2 `SvgPath` 与 viewBox

- 解析 **`viewBox`** 为四个数字 **`minX, minY, vbWidth, vbHeight`**；若解析失败，行为与 **§8** 错误语义一致。
- **默认**：**均匀缩放**使 path 完整落入布局框，并 **居中**（**letterbox**）；不强制拉伸变形，除非后续规格增加 `uniformScale: false` 类选项（本规格 **不提供**）。

---

## 8. 缓存与资源生命周期

- **`Image`**：**`uri` → 解码后 `SkImage`** 的缓存表；v1 可为 **Map**；文档中说明 **长期运行内存增长** 风险，后续可加 LRU 或引用计数。
- **`SvgPath`**：按 **`d`（及必要时的 viewBox）** 缓存 **`SkPath`**；节点卸载时 **释放** 与 CanvasKit 生命周期一致。

---

## 9. 命中检测

- **v1**：**布局轴对齐包围盒**（与 [technical-research.md](../../technical-research.md) 及阶段三一致）；**不**要求 path 内点进测试。

---

## 10. 错误语义

- **`Image`**：fetch 失败或解码失败 → **`onError`**，绘制层 **不绘制图片**（或透明占位，二选一成文；推荐 **不绘制**）。
- **`SvgPath`**：**`d` 无法构造有效 path** → 不抛异常至 React；**`onError`（若提供）** 或 **开发环境 `console.warn`** 二选一成文；**不绘制 path**。

---

## 11. 测试与验收

- **单元测试**：`resizeMode` 矩形计算；**viewBox 解析与变换矩阵**（可用纯数学断言）；无效 `d` / 无效 viewBox 行为。
- **验收示例（与 roadmap 一致并扩展 SvgPath）**：

```tsx
<Image
  source={{ uri: "https://example.com/photo.jpg" }}
  style={{ width: 200, height: 150 }}
  onLoad={() => {}}
/>
<SvgPath
  d="M12 2L2 7l10 5 10-5-10-5z"
  size={24}
  stroke="#000"
  fill="none"
  strokeWidth={2}
/>
```

---

## 12. 交付顺序（建议）

1. **`Image`**（roadmap Step 8 主交付）。
2. **`SvgPath`**（同阶段紧随或同一里程碑分 PR），避免 reconciler 二次大改。

---

## 13. 交叉引用

- [development-roadmap.md](../../development-roadmap.md) — 阶段四 Step 8–9
- [hostconfig-guide.md](../../hostconfig-guide.md) — commit 阶段不写重绘
- [runtime-structure-constraints.md](../../runtime-structure-constraints.md) — 合法子树
- [technical-research.md](../../technical-research.md) — 命中与 Skia 能力概述
