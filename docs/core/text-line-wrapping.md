# Text 换行与行高（Skia Paragraph + Yoga 测量）

本文说明 **`@Text` 如何折行、行距如何算**，与 [react-yoga-text-nodes.md](../react/react-yoga-text-nodes.md) 中的「两棵树对照」配套阅读：那里讲 **结构**，这里讲 **排版参数** 在代码里怎么走。

---

## 1. 谁负责「换行」

| 层级                 | 是否按字符/词断行                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Yoga**             | **否**。只分配 **盒子宽高**；`Text` 通过 `setMeasureFunc` 问 Skia「在给定宽度下你要多高」。                  |
| **Skia `Paragraph`** | **是**。调用 **`Paragraph.layout(maxWidth)`** 后，断行、行数、省略号等由 **SkParagraph**（及底层规则）完成。 |

**结论**：软换行（自动折行）发生在 **`layout(内容区最大宽度)`** 内，不是 Yoga 再切一遍字符串。

---

## 2. 内容区宽度 `innerW` 从哪来

外层 **`TextNode`** 的 measure 回调（`packages/core/src/text-node.ts`）：

1. Yoga 传入当前约束下的 **`width`** 与 **`widthMode`**。
2. 减去左右 **padding**：`innerW = max(0, width - padL - padR)`。
3. 将 **`innerW`** 交给 **`measureParagraphSpans`**，内部对 **`Paragraph.layout(maxW)`** 使用。

**绘制**（`packages/core/src/paint.ts`）使用 Yoga **已结算**的 `node.layout.width`，再减同一套 padding 得到 **`innerW`**，再次 **`p.layout(innerW)`** 后 **`drawParagraph`**。  
**测量与绘制必须使用同一套宽度约束**，否则会出现「量出来一行、画出来两行」等不一致。

---

## 3. Yoga `MeasureMode` 与 `layoutMaxWidthForMeasure`

实现见 **`layoutMaxWidthForMeasure`**（`packages/core/src/paragraph-build.ts`）：

| `widthMode`                           | 传给 `Paragraph.layout` 的宽度含义                                                                                      |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **`Undefined`**                       | 视为 **无横向上限**（实现里用 **1e9** 近似），用于测 **固有宽度**（偏单行总宽）；最终排版仍以父布局给出的确定宽度为准。 |
| **`Exactly` / `AtMost` 等（有约束）** | 使用 **`innerW`**（已 finite、非负）；非法宽度按无界处理或早退 `{0,0}`。                                                |

`measureParagraphSpans` 在 `layout` 之后用 **`getLongestLine()`**、**`getHeight()`** 把尺寸回给 Yoga。

---

## 4. 行高 `lineHeight`（`heightMultiplier`）

Skia **`TextStyle.heightMultiplier`** 表示 **行高相对字号** 的倍数。

本仓库用 **`lineHeightToSkHeightMultiplier`**（同文件）区分两类写法：

- **约 0.5～4**：按 **CSS 无单位行高**（如 `1.45`）→ **直接**作为 `heightMultiplier`。
- **更大**：按 **绝对逻辑像素**（RN 常见）→ **`lineHeight / fontSize`**。

错误地把「`1.45`」当成像素再除以字号，会得到极小倍数，表现为 **行叠在一起**（见该函数注释）。

---

## 5. 行数与省略号

外层 **`Text`** 的 `textProps` 经 **`toParagraphStyle` / `paragraphShellForMultiSpans`** 映射到 **`ParagraphStyle`**：

- **`numberOfLines`** → **`maxLines`**（若实现传入）。
- **`ellipsizeMode === 'tail'`** → **`ellipsis`**（如 `"…"`）。

具体以 **`packages/core/src/paragraph-build.ts`** 为准。

---

## 6. 显式换行与字符

字符串中的 **`'\n'`** 一般由 Skia Paragraph **按换行符断行**（与常见富文本一致）；无需 Yoga 参与。

---

## 7. 当前未在宿主层单独建模的能力

以下若需 **与 Web CSS 对齐**（如 `word-break`、`overflow-wrap`），须依赖 **CanvasKit / SkParagraph 暴露能力** 或在 **`ParagraphStyle` / `TextStyle`** 上扩展映射；本仓库 **M2** 以 `TextOnlyProps` 已列字段为准。

---

## 8. 源码索引

| 主题                                                                                  | 路径                                   |
| ------------------------------------------------------------------------------------- | -------------------------------------- |
| `innerW`、measure 回调                                                                | `packages/core/src/text-node.ts`       |
| `layoutMaxWidthForMeasure`、`measureParagraphSpans`、`lineHeightToSkHeightMultiplier` | `packages/core/src/paragraph-build.ts` |
| 绘制时 `layout` + `drawParagraph`                                                     | `packages/core/src/paint.ts`           |
| `TextOnlyProps.lineHeight` 说明                                                       | `packages/core/src/text-style.ts`      |
