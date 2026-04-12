# ViewStyle 扩展：对齐 Web/CSS 的 Yoga 布局配置

**日期**：2026-04-12  
**状态**：已评审（实现前请再确认本文件）  
**范围**：`packages/core-v2` 的 `ViewStyle`、`applyStylesToYoga`、`clearYogaLayoutStyle`；消费方 `packages/react-v2` 的 `<View style>` 类型透传。

## 1. 背景与目标

当前 `ViewStyle` 仅映射 Yoga 的一小部分（宽高含 `%`、`flex`、`flexDirection`、`justifyContent`、`alignItems`、四边统一 `padding`、`position` + `left`/`top` 等）。目标是**在命名与心智上对齐 Web/CSS Flexbox（选项 B）**，分阶段增加 Yoga 已支持的布局能力，**不**在本 spec 内解决 `border`、`opacity`、`overflow` 裁剪、`z-index` 等非 Yoga 绘制/叠放主题。

## 2. 非目标

- `position: fixed` / `sticky`、层叠 `z-index`。
- 任意 CSS 长度单位（`em`、`rem`、`vw` 等）；**仅** `number`（px 语义）与 Yoga 支持百分比的轴上的 `` `${number}%` ``。
- 与 Yoga 无关的样式扩展（归入各自独立 spec）。

## 3. 运行时语义（与实现对齐）

`createSceneRuntime` 中，样式变更后的 Yoga 更新遵循：

- **`rebuildYogaStyle`**：先 `clearYogaLayoutStyle(node.yogaNode)`，再若存在 `node.viewStyle` 则 `applyStylesToYoga(node.yogaNode, node.viewStyle)`。
- **`updateStyle`**：整对象替换 `viewStyle`，然后 `rebuildYogaStyle`。
- **`patchStyle` / 带合并的 `insertView`/`insertText`**：`viewStyle` 为浅合并对象；随后对**合并后的完整 `viewStyle`** 调用 `rebuildYogaStyle`（即每次都是 clear + 全量按字段应用）。

**新建子节点**（首次 `insertView`/`insertText` 且非已存在 id）：在全新 Yoga 节点上直接 `applyStylesToYoga`（不先 clear），依赖节点创建时的默认态。

实现新字段时，**凡会影响 Yoga 布局的字段都必须在 `clearYogaLayoutStyle` 中可被重置**，否则 `patchStyle` 删除某键后，旧 Yoga 值会残留。

## 4. 分阶段交付

### 阶段 A — 盒模型与尺寸约束

| 概念          | 建议字段名（CSS 风格）                                             | 备注                                                                      |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 外边距        | `margin`、`marginTop`、`marginRight`、`marginBottom`、`marginLeft` | 值：`number` 或 `%`（以 Yoga 该轴是否支持为准，与 width/height 策略一致） |
| 内边距        | 保留 `padding`；增加 `paddingTop` / `Right` / `Bottom` / `Left`    | 见 §5 冲突解析                                                            |
| 最小/最大尺寸 | `minWidth`、`maxWidth`、`minHeight`、`maxHeight`                   | 同 `width`/`height` 的 number / `%` 约定                                  |
| 绝对定位偏移  | `right`、`bottom`                                                  | 与已有 `left`、`top` 对称；`position: absolute` 下使用                    |

### 阶段 B — Flex 扩展

| 概念            | 建议字段名                            | 备注                                          |
| --------------- | ------------------------------------- | --------------------------------------------- |
| 主轴/交叉轴间距 | `gap`、`rowGap`、`columnGap`          | 以 `yoga-layout@^3.2.1` 实际 API 为准命名映射 |
| 换行            | `flexWrap`                            | 如 `nowrap` \| `wrap` \| `wrap-reverse`       |
| 多行对齐        | `alignContent`                        | 与 CSS 取值子集对齐，映射到 Yoga `Align`      |
| 单个子项对齐    | `alignSelf`                           | 含 `auto` 若 Yoga 支持                        |
| flex 分项       | `flexGrow`、`flexShrink`、`flexBasis` | 见 §6 与 `flex` 关系                          |

阶段 B 可在阶段 A 合并稳定后再开 PR，或同一 spec 下两个里程碑分批合并。

## 5. `padding` / `margin`：shorthand 与单边并存

合并后的 `viewStyle` 可能同时含 `padding` 与 `paddingTop` 等。**解析到 Yoga 的每一边**采用：

- **该边若存在单边字段（已定义且参与合并后的对象上仍有该键）**：使用该边的值。
- **否则**：若存在 `padding` shorthand，使用该值。
- **否则**：在 `clearYogaLayoutStyle` 已将该边置 0 的前提下，可不调用 setter（或显式 0，与现有代码风格一致）。

`margin` 与 `marginTop` 等同理。

说明：浅合并下「删除 shorthand」需通过 `updateStyle` 整对象替换或约定 `undefined` 是否从对象删除；当前 `patchStyle` 无法删除键。本 spec **不**改变存储模型；若未来需要「取消 margin」，用 `updateStyle` 或扩展 API，不在本阶段强制。

## 6. `flex` 与 `flexGrow` / `flexShrink` / `flexBasis`

- 保留现有 **`flex?: number`**（映射到 Yoga `setFlex` 或项目当前等价实现）。
- **若合并后的 `viewStyle` 上存在 `flex` 字段**（含 `flex: 0`）：**仅以 `flex` 为准**设置 flex 相关伸缩语义，**不再**在同一轮 `applyStylesToYoga` 中应用 `flexGrow` / `flexShrink` / `flexBasis`（与 CSS 中 shorthand 覆盖分项的常见心智一致，且避免双写冲突）。
- **若不存在 `flex`**：则对出现的 `flexGrow`、`flexShrink`、`flexBasis` 分别调用 Yoga setter；未出现的分项保持 `clearYogaLayoutStyle` 后的默认。

## 7. 类型与导出

- 在 `style-map.ts` 中扩展 `ViewStyle`；`packages/core-v2/src/index.ts` 继续导出 `ViewStyle`。
- `react-v2` 的 `View` props 使用同一类型，无需重复定义冲突的并行类型。

## 8. 测试建议

- 在 `packages/core-v2/tests/layout-sync.test.ts` 或新增专用文件中增加用例：margin 影响子节点偏移、min/max 约束宽高、`gap` 在 row+column 下的间距（阶段 B）。
- 回归现有 `dispatch`、`hit-test` 等依赖布局的测试。

## 9. 实现自检清单

- [ ] 每个新增 Yoga 字段在 `clearYogaLayoutStyle` 中有对应重置。
- [ ] `applyStylesToYoga` 对合并后 `viewStyle` 的解析与 §5、§6 一致。
- [ ] 新建节点路径与 `rebuildYogaStyle` 路径行为仍符合 §3。
- [ ] 运行 `vp check` 与 `vp test`。

## 10. 后续

用户确认本 spec 无修改后，使用 **writing-plans** skill 编写实现计划（任务拆分、文件列表、验收标准）。
